import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const clonedRequest = request.clone();
  let shop = null;

  try {
    const result = await authenticate.webhook(request);
    shop = result.shop;
    console.log(`Received ${result.topic} webhook for ${shop}`);
    if (result.session) {
      await db.session.deleteMany({ where: { shop } });
    }
  } catch (err) {
    console.warn(`⚠️  authenticate.webhook error (normal on reinstall): ${err.message}`);
    try {
      const body = await clonedRequest.json();
      shop = body?.myshopify_domain || body?.domain || null;
      console.log(`   Extracted shop from payload: ${shop}`);
    } catch {
      console.error("❌ Could not parse webhook payload");
    }
  }

  // Mark uninstalled in backend — sets app_uninstalled=true AND resets plan to free
  // The loader checks this flag on next open and keeps free regardless of Shopify subscription
  if (shop) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${backendUrl}/api/mark-uninstalled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_domain: shop }),
      });
      const data = await res.json();
      console.log(`✅ Shop marked as uninstalled + plan reset to free: ${shop}`, data);
    } catch (err) {
      console.error(`❌ Could not mark uninstalled for ${shop}:`, err.message);
    }
  }

  return new Response(null, { status: 200 });
};
