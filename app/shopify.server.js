import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  hooks: {
    /**
     * afterAuth runs after EVERY successful OAuth flow — both first install
     * and reinstall. This is the only guaranteed, synchronous place to detect
     * a reinstall and reset the plan before the merchant sees the dashboard.
     *
     * - First install  → creates the shop record with plan=free
     * - Reinstall      → resets plan to free + sets install_status="reinstalled"
     *
     * We await this so the flag is written to the DB before the merchant
     * is redirected to app._index, which reads the flag.
     */
    afterAuth: async ({ session }) => {
      const shop = session.shop;
      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
      try {
        const res = await fetch(`${backendUrl}/api/merchant/onboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_domain: shop,
            shop_email: `${shop.split(".")[0]}@shopify.com`,
            shop_name: shop,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const isReinstall = data.message?.includes("reinstalled");
          console.log(
            isReinstall
              ? `🔄 afterAuth reinstall: ${shop} → plan reset to free, install_status=reinstalled`
              : `🎉 afterAuth first install: ${shop} → free plan record created`
          );
        } else {
          console.warn(`⚠️  afterAuth onboard returned error for ${shop}:`, data.error);
        }
      } catch (err) {
        console.error(`❌ afterAuth onboard failed for ${shop}:`, err.message);
      }
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
