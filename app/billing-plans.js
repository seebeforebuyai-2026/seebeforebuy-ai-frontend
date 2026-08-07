/**
 * billing-plans.js
 * Shared plan definitions — used by both server (app.billing.jsx) and client (app.plans.jsx).
 * Must NOT import shopify.server or any server-only modules.
 */

export const PLANS = {
  standard: {
    name: "Standard Plan — 500 AI Try-Ons / month",
    price: "29.00",
    currency: "USD",
    images: 500,
    plan_type: "starter",
    label: "Standard",
    displayPrice: "$29",
  },
  growth: {
    name: "Growth Plan — 1,000 AI Try-Ons / month",
    price: "59.00",
    currency: "USD",
    images: 1000,
    plan_type: "growth",
    label: "Growth",
    displayPrice: "$59",
  },
  scale: {
    name: "Scale Plan — 10,000 AI Try-Ons / month",
    price: "299.00",
    currency: "USD",
    images: 10000,
    plan_type: "pro",
    label: "Scale",
    displayPrice: "$299",
  },
};

export const PLAN_CREDITS = {
  Standard: 500,
  Growth: 1000,
  Scale: 10000,
  Free: 50,
};
