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
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  const chargeId = url.searchParams.get("charge_id");
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
      const subs = data.data?.currentAppInstallation?.activeSubscriptions;
      if (subs && subs.length > 0) {
        planName = subs[0].name; // e.g. "Standard Plan — 500 AI Try-Ons / month"
        console.log(`📋 Active subscription name: ${planName}`);
        // Parse plan key from name
        if (planName.toLowerCase().includes('standard')) planImages = 500;
        else if (planName.toLowerCase().includes('growth')) planImages = 1000;
        else if (planName.toLowerCase().includes('scale')) planImages = 10000;
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

// ── Action: redirect to Shopify-hosted pricing page ─────────────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shopHandle = session.shop.replace(".myshopify.com", "");
  const appHandle = "see-before-buy-ai-full";
  const appUrl = process.env.SHOPIFY_APP_URL || "https://seebeforebuy.in";

  // returnUrl tells Shopify where to redirect merchant after subscribing
  const returnUrl = encodeURIComponent(`${appUrl}/app/billing?shop=${session.shop}`);
  const pricingUrl = `https://admin.shopify.com/store/${shopHandle}/charges/${appHandle}/pricing_plans?return_url=${returnUrl}`;

  return { success: true, confirmationUrl: pricingUrl };
};
