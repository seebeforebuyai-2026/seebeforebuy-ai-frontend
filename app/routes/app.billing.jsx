/**
 * app.billing.jsx
 *
 * Using "Shopify App Pricing" (managed) — NO Billing API needed.
 * Shopify hosts the pricing page at:
 * https://admin.shopify.com/store/{store-handle}/charges/{app-handle}/pricing_plans
 *
 * Flow:
 *   POST /app/billing  →  redirect merchant to Shopify-hosted pricing page
 *   GET  /app/billing  →  Shopify redirects here after merchant subscribes
 *                       →  activate plan in backend
 */

import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

// ── GET: Shopify redirects here after merchant subscribes ────────────────────
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    return redirect("/app/plans");
  }

  console.log(`💳 Billing callback — shop: ${session.shop} | charge: ${chargeId}`);

  let planName = null;
  let planImages = null;

  // Query Shopify to get the actual plan name from the active subscription
  if (admin) {
    try {
      const response = await admin.graphql(`
        query {
          currentAppInstallation {
            activeSubscriptions {
              name
              status
              lineItems {
                plan {
                  pricingDetails {
                    ... on AppRecurringPricing {
                      price { amount }
                    }
                  }
                }
              }
            }
          }
        }
      `);
      const data = await response.json();
      const subs = data.data?.currentAppInstallation?.activeSubscriptions || [];

      // Find the active (approved) subscription
      const activeSub = subs.find((s) => s.status === "ACTIVE") || subs[0];

      if (activeSub) {
        planName = activeSub.name;
        console.log(`📋 Active subscription name: "${planName}" | status: ${activeSub.status}`);

        if (activeSub.status === "DECLINED") {
          console.log(`❌ Merchant declined the subscription`);
          return redirect("/app/plans?declined=1");
        }

        // Parse credits from plan name
        if (planName.toLowerCase().includes("scale")) planImages = 10000;
        else if (planName.toLowerCase().includes("growth")) planImages = 1000;
        else if (planName.toLowerCase().includes("standard")) planImages = 500;
      }
    } catch (err) {
      console.error("⚠️  Could not query active subscription:", err.message);
    }
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_domain: session.shop,
        charge_id: chargeId,
        plan_name: planName,
        images_limit: planImages,
      }),
    });
    console.log(`✅ Backend notified — plan: ${planName} | credits: ${planImages}`);
  } catch (err) {
    console.error("❌ Backend notification failed:", err.message);
  }

  return redirect("/app/plans?activated=1");
};

// ── POST: Redirect merchant to Shopify-hosted pricing page ──────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shopHandle = session.shop.replace(".myshopify.com", "");
  const appHandle = "see-before-buy-ai-full";
  const appUrl = process.env.SHOPIFY_APP_URL || "https://seebeforebuy.in";

  // returnUrl tells Shopify where to redirect merchant after subscribing
  const returnUrl = encodeURIComponent(
    `${appUrl}/app/billing?shop=${session.shop}`,
  );
  const pricingUrl = `https://admin.shopify.com/store/${shopHandle}/charges/${appHandle}/pricing_plans?return_url=${returnUrl}`;

  return { success: true, confirmationUrl: pricingUrl };
};
