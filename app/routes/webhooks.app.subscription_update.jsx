/**
 * webhooks.app.subscription_update.jsx
 *
 * Handles Shopify's app_subscriptions/update webhook.
 * Fires when a merchant subscribes, cancels, or changes their plan.
 */

import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const clonedRequest = request.clone();
  let topic, shop, payload;

  try {
    const result = await authenticate.webhook(request);
    topic = result.topic;
    shop = result.shop;
    payload = result.payload;
  } catch (err) {
    console.warn(`⚠️  authenticate.webhook error: ${err.message}`);
    // Extract shop from raw body as fallback
    try {
      const body = await clonedRequest.json();
      shop = body?.shop_domain || null;
      payload = body;
      topic = "app_subscriptions/update";
    } catch {
      console.error("❌ Could not parse webhook payload");
      return new Response(null, { status: 200 });
    }
  }

  console.log(`📬 Webhook: ${topic} | shop: ${shop}`);

  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    const subscription = payload?.app_subscription || payload;
    const status = (subscription?.status || "").toUpperCase();
    const planName = (subscription?.name || "").toLowerCase();

    console.log(`📋 Subscription status: ${status} | plan: "${subscription?.name}"`);

    if (status === "ACTIVE") {
      // DO NOT activate plan from this webhook.
      // Plan activation is handled by app.billing.jsx loader (ground truth from Shopify session).
      // This webhook fires unreliably and can re-activate after reinstall.
      // The app loader syncs the correct plan on every page open.
      console.log(`ℹ️  app_subscriptions/update ACTIVE received for ${shop} — skipping (handled by loader)`);
      return new Response(null, { status: 200 });

    } else if (status === "CANCELLED" || status === "EXPIRED" || status === "FROZEN") {
      // Subscription cancelled/expired/frozen — reset to free
      const res = await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shop,
          plan_name: "free",
          images_limit: 50,
          reason: `subscription_${status.toLowerCase()}`,
        }),
      });
      const data = await res.json();
      console.log(`⬇️  Plan reset to free (${status}): ${shop}`, data);
    }

  } catch (err) {
    console.error("❌ Webhook handler error:", err.message);
  }

  return new Response(null, { status: 200 });
};
