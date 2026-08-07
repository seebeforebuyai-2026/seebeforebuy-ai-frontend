/**
 * app.billing.jsx
 * Handles Shopify recurring subscription confirmation callback.
 * Shopify redirects here after merchant confirms subscription.
 */

import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

// ── Plan definitions — single source of truth ──────────────────────────────
export const PLANS = {
  standard: {
    name: "Standard Plan — 500 AI Try-Ons / month",
    price: "29.00",
    currency: "USD",
    images: 500,
    plan_type: "starter",
    interval: "EVERY_30_DAYS",
  },
  growth: {
    name: "Growth Plan — 1,000 AI Try-Ons / month",
    price: "59.00",
    currency: "USD",
    images: 1000,
    plan_type: "growth",
    interval: "EVERY_30_DAYS",
  },
  scale: {
    name: "Scale Plan — 10,000 AI Try-Ons / month",
    price: "299.00",
    currency: "USD",
    images: 10000,
    plan_type: "pro",
    interval: "EVERY_30_DAYS",
  },
};

// ── Loader: Shopify redirects here after subscription confirmed ─────────────
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const planKey = url.searchParams.get("plan");

  if (!chargeId || !planKey) {
    return redirect("/app/plans");
  }

  const plan = PLANS[planKey];
  if (!plan) {
    return redirect("/app/plans");
  }

  console.log(`✅ Subscription confirmed — shop: ${session.shop} | plan: ${planKey} | charge: ${chargeId}`);

  // Activate plan in backend
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    const res = await fetch(`${backendUrl}/api/shop-status/upgrade-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_domain: session.shop,
        plan_type: plan.plan_type,
        images_limit: plan.images,
        shopify_charge_id: chargeId,
        billing_interval: "EVERY_30_DAYS",
      }),
    });
    const data = await res.json();
    console.log("✅ Subscription activated in backend:", data);
  } catch (err) {
    console.error("❌ Failed to activate subscription in backend:", err.message);
  }

  return redirect("/app/plans?activated=1");
};

// ── Action: creates Shopify recurring subscription ──────────────────────────
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get("plan");

  const plan = PLANS[planKey];
  if (!plan) {
    return { success: false, error: "Invalid plan selected" };
  }

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const returnUrl = `${appUrl}/app/billing?plan=${planKey}`;
  const isTest = process.env.NODE_ENV !== "production";

  console.log(`💳 Creating subscription for ${session.shop} | plan: ${planKey} | test: ${isTest}`);

  try {
    const response = await admin.graphql(`
      mutation appSubscriptionCreate(
        $name: String!
        $lineItems: [AppSubscriptionLineItemInput!]!
        $returnUrl: URL!
        $test: Boolean
        $trialDays: Int
      ) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          test: $test
          trialDays: $trialDays
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        name: plan.name,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.price, currencyCode: plan.currency },
                interval: plan.interval,
              },
            },
          },
        ],
        returnUrl,
        test: isTest,
        trialDays: 0,
      },
    });

    const data = await response.json();
    const result = data.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      console.error("❌ Shopify subscription error:", result.userErrors);
      return { success: false, error: result.userErrors[0].message };
    }

    if (result?.confirmationUrl) {
      return redirect(result.confirmationUrl);
    }

    return { success: false, error: "Could not get confirmation URL from Shopify" };
  } catch (error) {
    console.error("❌ Error creating subscription:", error.message);
    return { success: false, error: error.message };
  }
};
