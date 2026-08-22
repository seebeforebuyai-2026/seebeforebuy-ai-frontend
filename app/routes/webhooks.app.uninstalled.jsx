import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // ── Shopify requirement: on uninstall, reset billing plan to free ──────────
  // This ensures that on reinstall the merchant gets a clean free plan,
  // satisfying Shopify's review requirement: "plan must be reverted to free on reinstall".
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
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
    console.log(`✅ Plan reset to free on uninstall: ${shop}`);
  } catch (err) {
    // Non-critical — log and continue (Shopify needs 200 back quickly)
    console.error(`⚠️  Could not reset plan on uninstall for ${shop}:`, err.message);
  }

  return new Response();
};
