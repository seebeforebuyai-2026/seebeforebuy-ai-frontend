import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  // Clone the request so we can read the body for shop domain
  // even if authenticate.webhook throws (e.g. session already deleted)
  const clonedRequest = request.clone();

  let shop = null;

  try {
    const result = await authenticate.webhook(request);
    shop = result.shop;

    console.log(`Received ${result.topic} webhook for ${shop}`);

    // Delete sessions — only if session exists
    if (result.session) {
      await db.session.deleteMany({ where: { shop } });
    }
  } catch (err) {
    // authenticate.webhook can throw when the app is already uninstalled
    // and the session is gone. Extract shop from the raw payload instead.
    console.warn(`⚠️  authenticate.webhook error (expected on reinstall): ${err.message}`);
    try {
      const body = await clonedRequest.json();
      shop = body?.myshopify_domain || body?.shop_domain || null;
      console.log(`   Extracted shop from payload: ${shop}`);
    } catch {
      console.error("❌ Could not extract shop domain from webhook payload");
    }
  }

  // ── Reset billing plan to free regardless of auth errors ──────────────────
  // This MUST run even when the session is gone (which is normal for uninstall).
  // Shopify requirement: plan must revert to free on reinstall.
  if (shop) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shop,
          plan_name: "free",
          images_limit: 50,
          charge_id: null,
          reason: "app_uninstalled",
        }),
      });
      const data = await res.json();
      console.log(`✅ Plan reset to free on uninstall: ${shop}`, data);
    } catch (fetchErr) {
      console.error(`❌ Could not reset plan for ${shop}:`, fetchErr.message);
    }
  }

  // Always return 200 — Shopify requires this even on errors
  return new Response(null, { status: 200 });
};
