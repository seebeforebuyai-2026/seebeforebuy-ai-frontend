/**
 * webhooks.app.subscription_update.jsx
 *
 * Handles Shopify's app_subscriptions/update webhook.
 * Fires when a merchant subscribes, cancels, or changes their plan.
 *
 * This is the RELIABLE way to detect plan changes for Shopify App Pricing.
 * It fires even when the billing callback URL is not configured.
 */

import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`📬 Webhook: ${topic} | shop: ${shop}`);
  console.log(`   Payload:`, JSON.stringify(payload, null, 2));

  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    // payload.app_subscription contains the subscription details
    const subscription = payload.app_subscription || payload;
    const status = subscription.status; // ACTIVE, CANCELLED, DECLINED, EXPIRED
    const planName = subscription.name || "";

    console.log(`📋 Subscription status: ${status} | plan: ${planName}`);

    if (status === "ACTIVE") {
      // Determine credits from plan name
      let images_limit = 500; // default Standard
      let plan_type = "starter";

      if (planName.toLowerCase().includes("scale")) {
        images_limit = 10000;
        plan_type = "pro";
      } else if (planName.toLowerCase().includes("growth")) {
        images_limit = 1000;
        plan_type = "growth";
      } else if (planName.toLowerCase().includes("standard")) {
        images_limit = 500;
        plan_type = "starter";
      }

      // Activate plan in backend
      const res = await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shop,
          plan_name: planName,
          images_limit,
          charge_id: subscription.admin_graphql_api_id || null,
        }),
      });

      const data = await res.json();
      console.log(`✅ Plan activated via webhook: ${shop} → ${plan_type} (${images_limit} credits)`);
      console.log(`   Backend response:`, data);

    } else if (status === "CANCELLED" || status === "EXPIRED") {
      // Downgrade to free plan
      await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shop,
          plan_name: "free",
          images_limit: 50,
        }),
      });
      console.log(`⬇️  Plan downgraded to free: ${shop}`);
    }

  } catch (err) {
    console.error("❌ Webhook handler error:", err.message);
  }

  return new Response(null, { status: 200 });
};
