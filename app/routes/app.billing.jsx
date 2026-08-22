/**
 * app.billing.jsx
 *
 * Implements Shopify Billing API correctly as required by Shopify App Review.
 *
 * REQUIREMENT: "Implement Shopify App Pricing or the Shopify Billing API correctly.
 * It must correctly implement to ensure that it can accept, decline and request
 * approval for charges again on reinstall."
 *
 * FLOW:
 *   POST /app/billing  →  create AppSubscription via Billing API  →  return confirmationUrl
 *   GET  /app/billing  →  merchant returns after approving/declining on Shopify
 *                       →  verify charge status, activate or handle decline
 */

import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

// Plan → Billing API config (must match Partner Dashboard plan names exactly)
const PLAN_CONFIG = {
  standard: {
    name: "Standard Plan — 500 AI Try-Ons / month",
    amount: "29.00",
    currencyCode: "USD",
    images_limit: 500,
    plan_type: "starter",
  },
  growth: {
    name: "Growth Plan — 1,000 AI Try-Ons / month",
    amount: "59.00",
    currencyCode: "USD",
    images_limit: 1000,
    plan_type: "growth",
  },
  scale: {
    name: "Scale Plan — 10,000 AI Try-Ons / month",
    amount: "299.00",
    currencyCode: "USD",
    images_limit: 10000,
    plan_type: "pro",
  },
};

// ── GET: Shopify redirects here after merchant approves/declines ─────────────
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    // No charge_id means direct navigation — redirect to plans page
    return redirect("/app/plans");
  }

  console.log(`💳 Billing callback — shop: ${session.shop} | charge: ${chargeId}`);

  // Query Shopify Billing API to verify the subscription status
  // This correctly handles: approved, declined, and reinstall scenarios
  try {
    const response = await admin.graphql(`
      query GetSubscription($id: ID!) {
        node(id: $id) {
          ... on AppSubscription {
            id
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price { amount currencyCode }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: {
        id: `gid://shopify/AppSubscription/${chargeId}`,
      },
    });

    const data = await response.json();
    const subscription = data.data?.node;

    console.log(`📋 Subscription status: ${subscription?.status} | name: "${subscription?.name}"`);

    if (!subscription) {
      console.error("❌ Could not find subscription with charge_id:", chargeId);
      return redirect("/app/plans?error=charge_not_found");
    }

    if (subscription.status === "ACTIVE") {
      // ── Merchant approved — activate plan in backend ──────────────────────
      const planName = (subscription.name || "").toLowerCase();
      let images_limit = 500;
      let plan_type = "starter";

      if (planName.includes("scale")) {
        images_limit = 10000;
        plan_type = "pro";
      } else if (planName.includes("growth")) {
        images_limit = 1000;
        plan_type = "growth";
      } else if (planName.includes("standard")) {
        images_limit = 500;
        plan_type = "starter";
      }

      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
      await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: session.shop,
          charge_id: chargeId,
          plan_name: planName,
          images_limit,
        }),
      });

      console.log(`✅ Plan activated: ${session.shop} → ${plan_type} (${images_limit} credits)`);
      return redirect("/app/plans?activated=1");

    } else if (subscription.status === "DECLINED") {
      // ── Merchant declined — keep them on free plan, show message ─────────
      console.log(`❌ Subscription declined by merchant: ${session.shop}`);
      return redirect("/app/plans?declined=1");

    } else if (subscription.status === "PENDING") {
      // ── Still pending — this shouldn't happen on callback, but handle it ──
      console.log(`⏳ Subscription still pending: ${session.shop}`);
      return redirect("/app/plans?pending=1");

    } else {
      // ── Unknown status ────────────────────────────────────────────────────
      console.warn(`⚠️  Unknown subscription status: ${subscription.status}`);
      return redirect("/app/plans?error=unknown_status");
    }

  } catch (err) {
    console.error("❌ Error verifying subscription:", err.message);
    return redirect("/app/plans?error=verification_failed");
  }
};

// ── POST: Create a new AppSubscription via Shopify Billing API ───────────────
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get("plan");

  const planConfig = PLAN_CONFIG[planKey];
  if (!planConfig) {
    return { success: false, error: `Unknown plan: ${planKey}` };
  }

  // Build the return URL — Shopify redirects here after merchant approves/declines
  const appUrl = process.env.SHOPIFY_APP_URL || "https://seebeforebuy.in";
  const returnUrl = `${appUrl}/app/billing?shop=${session.shop}`;

  console.log(`💳 Creating AppSubscription: shop=${session.shop} plan=${planKey}`);
  console.log(`   Return URL: ${returnUrl}`);

  try {
    // Cancel any existing pending subscriptions first
    // (handles reinstall scenario — old pending charges must be cleaned up)
    try {
      const existingRes = await admin.graphql(`
        query {
          currentAppInstallation {
            activeSubscriptions {
              id
              status
              name
            }
          }
        }
      `);
      const existingData = await existingRes.json();
      const activeSubs = existingData.data?.currentAppInstallation?.activeSubscriptions || [];

      for (const sub of activeSubs) {
        if (sub.status === "ACTIVE" || sub.status === "PENDING") {
          console.log(`🔄 Cancelling existing subscription: ${sub.id} (${sub.name})`);
          await admin.graphql(`
            mutation CancelSubscription($id: ID!) {
              appSubscriptionCancel(id: $id) {
                appSubscription { id status }
                userErrors { field message }
              }
            }
          `, { variables: { id: sub.id } });
        }
      }
    } catch (cancelErr) {
      // Non-critical — log and continue
      console.warn("⚠️  Could not cancel existing subscription:", cancelErr.message);
    }

    // Create the new subscription using Shopify Billing API
    const createRes = await admin.graphql(`
      mutation CreateSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean!) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          returnUrl: $returnUrl
          test: $test
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
        name: planConfig.name,
        returnUrl,
        test: process.env.NODE_ENV !== "production", // use test mode in dev
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: planConfig.amount,
                  currencyCode: planConfig.currencyCode,
                },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    });

    const createData = await createRes.json();
    const result = createData.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      const errMsg = result.userErrors.map((e) => e.message).join(", ");
      console.error(`❌ Billing API userErrors: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const confirmationUrl = result?.confirmationUrl;
    if (!confirmationUrl) {
      throw new Error("No confirmationUrl returned from Shopify Billing API");
    }

    console.log(`✅ AppSubscription created: ${result.appSubscription?.id}`);
    console.log(`   Confirmation URL: ${confirmationUrl}`);

    return { success: true, confirmationUrl };

  } catch (err) {
    console.error("❌ Error creating subscription:", err.message);
    return { success: false, error: err.message };
  }
};
