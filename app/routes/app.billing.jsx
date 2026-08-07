/**
 * app.billing.jsx
 *
 * Handles Shopify billing for embedded apps.
 *
 * KEY POINT: Shopify embedded apps run inside an iframe.
 * The billing confirmation page CANNOT load inside an iframe (X-Frame-Options: deny).
 * Solution: Use the special Shopify-Served-By header to do a top-level redirect.
 *
 * Official pattern: Return the confirmationUrl and redirect at top level using
 * the `Shopify-App-Init-URL` header or use `@shopify/shopify-app-react-router` billing helper.
 */

import { redirect } from "react-router";
import { authenticate, shopify } from "../shopify.server";

// Plan definitions
export const PLANS = {
  standard: {
    name: "Standard Plan — 500 AI Try-Ons / month",
    price: "29.00",
    currency: "USD",
    images: 500,
    plan_type: "starter",
  },
  growth: {
    name: "Growth Plan — 1,000 AI Try-Ons / month",
    price: "59.00",
    currency: "USD",
    images: 1000,
    plan_type: "growth",
  },
  scale: {
    name: "Scale Plan — 10,000 AI Try-Ons / month",
    price: "299.00",
    currency: "USD",
    images: 10000,
    plan_type: "pro",
  },
};

// ── Loader: called after Shopify redirects back post-payment ─────────────────
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const planKey = url.searchParams.get("plan");

  if (!chargeId || !planKey) {
    return redirect("/app/plans");
  }

  const plan = PLANS[planKey];
  if (!plan) return redirect("/app/plans");

  // Activate plan in backend
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    await fetch(`${backendUrl}/api/shop-status/upgrade-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_domain: session.shop,
        plan_type: plan.plan_type,
        images_limit: plan.images,
        shopify_charge_id: chargeId,
      }),
    });
    console.log(`✅ Plan ${planKey} activated for ${session.shop}`);
  } catch (err) {
    console.error("❌ Backend plan activation failed:", err.message);
  }

  return redirect("/app/plans?activated=1");
};

// ── Action: creates subscription and returns confirmationUrl as JSON ─────────
// The frontend (app.plans.jsx) handles the top-level redirect via shopify.open()
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get("plan");

  const plan = PLANS[planKey];
  if (!plan) return { success: false, error: "Invalid plan" };

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const returnUrl = `${appUrl}/app/billing?plan=${planKey}`;
  const isTest = process.env.NODE_ENV !== "production";

  try {
    const response = await admin.graphql(`
      mutation appSubscriptionCreate(
        $name: String!
        $lineItems: [AppSubscriptionLineItemInput!]!
        $returnUrl: URL!
        $test: Boolean
      ) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          test: $test
        ) {
          appSubscription { id status }
          confirmationUrl
          userErrors { field message }
        }
      }
    `, {
      variables: {
        name: plan.name,
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: plan.price, currencyCode: plan.currency },
              interval: "EVERY_30_DAYS",
            },
          },
        }],
        returnUrl,
        test: isTest,
      },
    });

    const data = await response.json();
    const result = data.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      return { success: false, error: result.userErrors[0].message };
    }

    if (result?.confirmationUrl) {
      // Return the URL — frontend will do top-level redirect via shopify.open()
      return { success: true, confirmationUrl: result.confirmationUrl };
    }

    return { success: false, error: "No confirmation URL received" };
  } catch (error) {
    console.error("❌ Billing error:", error.message);
    return { success: false, error: error.message };
  }
};
