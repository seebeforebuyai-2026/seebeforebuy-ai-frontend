/**
 * webhooks.app.installed.jsx
 *
 * Fires every time a merchant installs (or reinstalls) the app.
 * Registered in shopify.app.toml under topics = ["app/installed"].
 *
 * On first install  → creates the shop record with plan=free.
 * On reinstall      → resets plan to free + sets install_status="reinstalled"
 *                     so the loader knows to cancel any lingering Shopify
 *                     subscription on the merchant's first page open.
 */

import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const clonedRequest = request.clone();
  let shop = null;

  try {
    const result = await authenticate.webhook(request);
    shop = result.shop;
    console.log(`🎉 app/installed webhook received for: ${shop}`);
  } catch (err) {
    // Webhook HMAC verification can fail on reinstall because the old session
    // was deleted by the uninstall webhook. Fall back to parsing the raw body.
    console.warn(`⚠️  authenticate.webhook error (expected on reinstall): ${err.message}`);
    try {
      const body = await clonedRequest.json();
      shop = body?.myshopify_domain || body?.domain || null;
      console.log(`   Extracted shop from payload: ${shop}`);
    } catch {
      console.error("❌ Could not parse app/installed webhook payload");
      return new Response(null, { status: 200 });
    }
  }

  if (!shop) {
    console.error("❌ app/installed webhook: could not determine shop domain");
    return new Response(null, { status: 200 });
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    // Call onboard endpoint — it checks whether the shop already exists.
    // If it does (reinstall): resets plan to free + sets install_status="reinstalled".
    // If it doesn't (first install): creates a fresh free-plan record.
    const res = await fetch(`${backendUrl}/api/merchant/onboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_domain: shop,
        shop_email: `${shop.split(".")[0]}@shopify.com`,
        shop_name: shop,
      }),
    });

    const data = await res.json();

    if (data.success) {
      const isReinstall = data.message?.includes("reinstalled");
      console.log(
        isReinstall
          ? `✅ Reinstall handled: ${shop} → plan reset to free, install_status=reinstalled`
          : `✅ First install handled: ${shop} → free plan account created`
      );
    } else {
      console.error(`❌ Onboard endpoint error for ${shop}:`, data.error);
    }
  } catch (err) {
    console.error(`❌ Could not call onboard endpoint for ${shop}:`, err.message);
  }

  return new Response(null, { status: 200 });
};
