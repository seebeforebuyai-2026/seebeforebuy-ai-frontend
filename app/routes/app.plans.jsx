/**
 * app.plans.jsx
 * Plans & Billing page — shows all plans, current plan, and buy buttons.
 */

import { useLoaderData, useFetcher, useSearchParams } from "react-router";
import { useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    const res = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
    const data = await res.json();
    return {
      shop: { domain: shopDomain },
      shopStatus: data.shopStatus || null,
      usage: data.usage || null,
    };
  } catch {
    return { shop: { domain: shopDomain }, shopStatus: null, usage: null };
  }
};

// Plan config for UI
const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    credits: 50,
    description: "Perfect to try out AI virtual try-on",
    features: [
      "50 AI Try-On images",
      "All product categories",
      "Try-on popup on product pages",
      "Basic analytics",
    ],
    badge: null,
    highlight: false,
  },
  {
    key: "standard",
    name: "Standard",
    price: "$29",
    period: "/month",
    credits: 500,
    description: "Great for growing stores",
    features: [
      "500 AI Try-On images / month",
      "Credits reset every 30 days",
      "All product categories",
      "Try-on popup on product pages",
      "Full analytics dashboard",
      "Priority support",
    ],
    badge: null,
    highlight: false,
  },
  {
    key: "growth",
    name: "Growth",
    price: "$59",
    period: "/month",
    credits: 1000,
    description: "For stores with high traffic",
    features: [
      "1,000 AI Try-On images / month",
      "Credits reset every 30 days",
      "All product categories",
      "Try-on popup on product pages",
      "Full analytics dashboard",
      "Priority support",
      "Download & share results",
    ],
    badge: "Most Popular",
    highlight: true,
  },
  {
    key: "scale",
    name: "Scale",
    price: "$299",
    period: "/month",
    credits: 10000,
    description: "For high-volume stores",
    features: [
      "10,000 AI Try-On images / month",
      "Credits reset every 30 days",
      "All product categories",
      "Try-on popup on product pages",
      "Full analytics dashboard",
      "Priority support",
      "Download & share results",
      "Dedicated onboarding",
    ],
    badge: "Best Value",
    highlight: false,
  },
];

export default function PlansPage() {
  const { shopStatus, usage } = useLoaderData();
  const fetcher = useFetcher({ key: "billing" });
  const shopify = useAppBridge();
  const [searchParams] = useSearchParams();

  const currentPlanType = shopStatus?.plan_type || "free";
  const isPurchasing = fetcher.state !== "idle";

  // Map backend plan_type to plan key
  const planTypeToKey = { free: "free", starter: "standard", growth: "growth", pro: "scale" };
  const currentPlanKey = planTypeToKey[currentPlanType] || "free";

  // Show success toast after activation
  useEffect(() => {
    if (searchParams.get("activated") === "1") {
      shopify.toast.show("🎉 Plan activated successfully! Credits added to your account.");
    }
  }, [searchParams, shopify]);

  // Show error if purchase failed
  // KEY FIX: When we get confirmationUrl back, open at TOP LEVEL (break out of iframe)
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.confirmationUrl) {
      // shopify.open() breaks out of the embedded app iframe — required for billing pages
      shopify.open(fetcher.data.confirmationUrl, "_top");
    }
    if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const handleBuyPlan = (planKey) => {
    fetcher.submit({ plan: planKey }, { method: "POST", action: "/app/billing" });
  };

  const getPlanButtonLabel = (plan) => {
    if (plan.key === "free") return "Free Forever";
    if (plan.key === currentPlanKey) return "✅ Current Plan";
    if (isPurchasing && fetcher.formData?.get("plan") === plan.key) return "⏳ Opening Shopify...";
    return `Subscribe — ${plan.price}/mo`;
  };

  const isPlanButtonDisabled = (plan) => {
    if (plan.key === "free") return true;
    if (plan.key === currentPlanKey) return true;
    return isPurchasing;
  };

  return (
    <s-page heading="Plans & Billing">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 0" }}>

        {/* Current Plan Banner */}
        <div style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>
              {currentPlanKey === "free" ? "Free Plan" : `${currentPlanKey.charAt(0).toUpperCase() + currentPlanKey.slice(1)} Plan`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>AI Try-On Credits</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#329580" }}>
              {usage?.remaining ?? 0} <span style={{ fontSize: 14, fontWeight: 400, color: "#6B7280" }}>remaining</span>
            </div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>
              {usage?.used ?? 0} used of {usage?.limit ?? 50} total
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 20,
        }}>
          {PLANS.map((plan) => (
            <div key={plan.key} style={{
              background: "#fff",
              border: plan.highlight ? "2px solid #329580" : "1px solid #E5E7EB",
              borderRadius: 16,
              padding: 28,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              boxShadow: plan.highlight ? "0 4px 20px rgba(50,149,128,0.15)" : "none",
            }}>
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #329580, #245b62)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 14px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{ fontSize: 36, fontWeight: 800, color: "#329580", margin: "12px 0 4px" }}>
                {plan.price}
                <span style={{ fontSize: 14, fontWeight: 400, color: "#6B7280", marginLeft: 4 }}>
                  {plan.period === "forever" ? "/ forever" : "/ one-time"}
                </span>
              </div>

              {/* Credits */}
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 4,
              }}>
                {plan.credits.toLocaleString()} AI Try-On Credits
              </div>

              {/* Description */}
              <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>
                {plan.description}
              </div>

              {/* Features */}
              <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: "#374151", padding: "4px 0", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: "#329580", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Button */}
              {plan.key === currentPlanKey ? (
                <div style={{
                  width: "100%",
                  padding: 12,
                  background: "#F3F4F6",
                  color: "#6B7280",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                }}>
                  ✅ Current Plan
                </div>
              ) : plan.key === "free" ? (
                <div style={{
                  width: "100%",
                  padding: 12,
                  background: "#F3F4F6",
                  color: "#9CA3AF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                }}>
                  Free Forever
                </div>
              ) : (
                <button
                  onClick={() => handleBuyPlan(plan.key)}
                  disabled={isPlanButtonDisabled(plan)}
                  style={{
                    width: "100%",
                    padding: 12,
                    background: isPlanButtonDisabled(plan)
                      ? "#E5E7EB"
                      : "linear-gradient(135deg, #329580 0%, #245b62 100%)",
                    color: isPlanButtonDisabled(plan) ? "#9CA3AF" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isPlanButtonDisabled(plan) ? "not-allowed" : "pointer",
                    transition: "opacity 0.2s",
                  }}
                >
                  {isPurchasing && fetcher.formData?.get("plan") === plan.key
                    ? "⏳ Opening Shopify..."
                    : `Subscribe — ${plan.price}/mo`}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Note */}
        <div style={{
          marginTop: 24,
          padding: "14px 18px",
          background: "#F0FDF4",
          border: "1px solid #A7F3D0",
          borderRadius: 10,
          fontSize: 13,
          color: "#065F46",
        }}>
          💡 All paid plans are <strong>monthly subscriptions</strong> — billed every 30 days by Shopify. Credits reset at the start of each billing cycle. Cancel anytime from your Shopify admin. Clicking "Subscribe" takes you to Shopify's secure checkout.
        </div>
      </div>
    </s-page>
  );
}
