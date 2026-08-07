/**
 * app.billing.jsx
 *
 * Using "Shopify App Pricing" (managed) — NO Billing API needed.
 * Shopify hosts the pricing page at:
 * https://admin.shopify.com/store/{store-handle}/charges/{app-handle}/pricing_plans
 *
 * This loader handles the return URL after merchant subscribes,
 * and activates the plan in our backend.
 */

import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

// ── Loader: Shopify redirects here after merchant subscribes ─────────────────
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Shopify sends charge_id when subscription is confirmed
  const chargeId = url.searchParams.get("charge_id");
  const planName = url.searchParams.get("plan_name"); // optional

  console.log(`✅ Plan activated — shop: ${session.shop} | charge: ${chargeId}`);

  // Activate plan in backend based on chargeId
  // We query Shopify to get plan details, then update our backend
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_domain: session.shop,
        charge_id: chargeId,
      }),
    });
    console.log(`✅ Backend notified of plan activation`);
  } catch (err) {
    console.error("❌ Backend notification failed:", err.message);
  }

  return redirect("/app/plans?activated=1");
};

// ── Action: redirect to Shopify-hosted pricing page ─────────────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // This is the official Shopify App Pricing URL
  // app-handle = your app's handle from Partner Dashboard
  const shopHandle = session.shop.replace(".myshopify.com", "");
  const appHandle = "see-before-buy-ai-full"; // from shopify.app.toml name field

  const pricingUrl = `https://admin.shopify.com/store/${shopHandle}/charges/${appHandle}/pricing_plans`;

  // Return URL so frontend can open it at top level (breaks out of iframe)
  return { success: true, confirmationUrl: pricingUrl };
};
