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
      // Before activating, check if the shop was recently uninstalled.
      // If app_uninstalled=true, the subscription webhook is firing from the OLD
      // subscription — do not re-activate. The reinstall loader handles the reset.
      let shopRecord = null;
      try {
        const checkRes = await fetch(`${backendUrl}/api/shop-status/${shop}`);
        shopRecord = await checkRes.json();
      } catch {}
      const wasUninstalled = shopRecord?.shopStatus?.install_status === "uninstalled";
      if (wasUninstalled) {
        console.log(`⏭️  Skipping plan activation — app_uninstalled=true for ${shop}`);
        return new Response(null, { status: 200 });
      }

      let images_limit = 500;
      let plan_type = "starter";

      if (planName.includes("scale")) { images_limit = 10000; plan_type = "pro"; }
      else if (planName.includes("growth")) { images_limit = 1000; plan_type = "growth"; }
      else if (planName.includes("standard")) { images_limit = 500; plan_type = "starter"; }
      else {
        console.warn(`⚠️  Unrecognized plan name: "${subscription?.name}" — defaulting to Standard`);
      }

      const res = await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shop,
          plan_name: planName,
          images_limit,
          charge_id: subscription?.admin_graphql_api_id || null,
        }),
      });
      const data = await res.json();
      console.log(`✅ Plan activated: ${shop} → ${plan_type} (${images_limit} credits)`, data);

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
