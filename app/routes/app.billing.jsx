/**
 * app.billing.jsx
 *
 * For Managed Pricing apps, Shopify controls the billing UI.
 * We redirect merchants to Shopify's native pricing page.
 *
 * The plan activation happens via webhook (app_subscriptions/update)
 * which hits our backend when a merchant subscribes/cancels.
 */

import { redirect } from "react-router";
import { authenticate } from "../shopify.server";

// Plan credit mapping — used by webhook handler to set correct limits
export const PLAN_CREDITS = {
  "Standard": 500,
  "Growth": 1000,
  "Scale": 10000,
  "Free": 50,
};

// ── Loader: redirect to Shopify managed pricing page ────────────────────────
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // Shopify managed pricing page URL for this app
  // Replace APP_HANDLE with your actual app handle from Partner Dashboard
  const appHandle = "see-before-buy-ai-full"; // from shopify.app.toml name field
  const pricingUrl = `https://${session.shop}/admin/charges/${appHandle}/pricing_plans`;

  return redirect(pricingUrl);
};

// ── Action: also redirect to Shopify pricing page ───────────────────────────
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const appHandle = "see-before-buy-ai-full";
  const pricingUrl = `https://${session.shop}/admin/charges/${appHandle}/pricing_plans`;

  return redirect(pricingUrl);
};
