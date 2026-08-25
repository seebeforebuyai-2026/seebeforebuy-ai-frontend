import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

/**
 * auth.$.jsx — OAuth callback handler.
 *
 * This runs on EVERY install AND reinstall because both go through OAuth.
 * We use this as the "app installed" hook to call our onboard endpoint,
 * which detects reinstalls (shop already exists) and resets the plan to free.
 */
export const loader = async ({ request }) => {
  // This completes the OAuth handshake and stores the session.
  // It also redirects the merchant into the app — must be called first.
  const result = await authenticate.admin(request);

  // After authenticate.admin completes, call our backend onboard endpoint.
  // - First install  → creates the shop record with plan=free
  // - Reinstall      → resets plan to free + sets install_status="reinstalled"
  //
  // We fire-and-forget (no await) so we don't block the redirect.
  // The loader in app._index.jsx will handle the flag on first page open.
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (shop) {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
      fetch(`${backendUrl}/api/merchant/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shop,
          shop_email: `${shop.split(".")[0]}@shopify.com`,
          shop_name: shop,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const isReinstall = data.message?.includes("reinstalled");
            console.log(
              isReinstall
                ? `🔄 Reinstall detected in auth: ${shop} → plan reset to free`
                : `🎉 First install in auth: ${shop} → free plan created`
            );
          }
        })
        .catch((err) =>
          console.error(`⚠️  auth onboard call failed for ${shop}:`, err.message)
        );
    }
  } catch (err) {
    // Non-critical — do not block the OAuth redirect
    console.error("⚠️  auth onboard error:", err.message);
  }

  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
