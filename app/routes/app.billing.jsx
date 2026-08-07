/**
 * app.billing.jsx — SERVER ONLY
 *
 * Handles Shopify billing for embedded apps.
 * Only exports loader and action (server-only).
 * No client-side exports to avoid server/client bundle conflict.
 */

import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { PLANS } from "../billing-plans";

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

// ── Action: creates subscription, returns confirmationUrl as JSON ─────────────
// Frontend (app.plans.jsx) uses shopify.open(confirmationUrl, "_top") to break out of iframe
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get("plan");

  const plan = PLANS[planKey];
  if (!plan) return { success: false, error: "Invalid plan" };

  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const returnUrl = `${appUrl}/app/billing?plan=${planKey}`;
  const isTest = process.env.NODE_ENV !== "production";

  console.log(`💳 Creating subscription — shop: ${session.shop} | plan: ${planKey} | test: ${isTest}`);

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
      console.error("❌ Shopify billing error:", result.userErrors);
      return { success: false, error: result.userErrors[0].message };
    }

    if (result?.confirmationUrl) {
      // Return URL as JSON — frontend will open at top level via shopify.open()
      return { success: true, confirmationUrl: result.confirmationUrl };
    }

    return { success: false, error: "No confirmation URL received from Shopify" };
  } catch (error) {
    console.error("❌ Billing error:", error.message);
    return { success: false, error: error.message };
  }
};
