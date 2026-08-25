import { useEffect, useState } from "react";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import styles from "./app._index/dashboard.module.css";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Handle Shopify App Pricing return URL
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const planHandle = url.searchParams.get("plan_handle");

  if (chargeId && planHandle) {
    console.log(
      `💳 Plan activated — shop: ${shopDomain} | plan: ${planHandle} | charge: ${chargeId}`,
    );
    const planMap = {
      standard: { plan_type: "Starter", images_limit: 500 },
      growth: { plan_type: "growth", images_limit: 1000 },
      scale: { plan_type: "pro", images_limit: 10000 },
    };
    const planConfig = planMap[planHandle.toLowerCase()] || planMap.standard;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          plan_name: planHandle,
          images_limit: planConfig.images_limit,
          charge_id: chargeId,
        }),
      });
    } catch (err) {
      console.error("❌ Plan activation failed in loader:", err.message);
    }
  }

  // ── BILLING PLAN SYNC ─────────────────────────────────────────────────────
  // Check install_status flag first (set by merchant-onboarding on reinstall).
  // If "uninstalled" → keep free, clear flag, done.
  // Otherwise → query Shopify for active subscription and sync.
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    const statusRes = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
    const statusData = await statusRes.json();
    const installStatus = statusData?.shopStatus?.install_status;

    if (installStatus === "uninstalled") {
      // Merchant reinstalled. Reset plan to free AND cancel the Shopify subscription
      // so future loads don't re-sync back to paid (Shopify keeps subscriptions ACTIVE after uninstall).
      console.log(`🔄 Reinstall detected: ${shopDomain} → cancelling subscription + forcing free`);

      // Cancel any active Shopify subscription using the live admin session
      try {
        const subRes = await admin.graphql(`
          query { currentAppInstallation { activeSubscriptions { id name status } } }
        `);
        const subData = await subRes.json();
        const subs = subData.data?.currentAppInstallation?.activeSubscriptions || [];
        for (const sub of subs) {
          if (sub.status === "ACTIVE") {
            console.log(`� Cancelling subscription: ${sub.id} (${sub.name})`);
            await admin.graphql(`
              mutation { appSubscriptionCancel(id: "${sub.id}") {
                appSubscription { id status }
                userErrors { message }
              }}
            `);
          }
        }
      } catch (cancelErr) {
        console.warn("⚠️ Could not cancel subscription:", cancelErr.message);
      }

      // Reset plan to free in backend
      await fetch(`${backendUrl}/api/reset-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          admin_secret: process.env.ADMIN_SECRET || "sbb-admin-reset-2024",
        }),
      }).catch(() => {});

      // Clear the install_status flag
      await fetch(`${backendUrl}/api/mark-uninstalled`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_domain: shopDomain }),
      }).catch(() => {});

      console.log(`✅ ${shopDomain} → subscription cancelled, plan=free, flag cleared`);
    } else {
      // Normal load — query Shopify for active subscription and sync
      const subRes = await admin.graphql(`
        query { currentAppInstallation { activeSubscriptions { name status } } }
      `);
      const subData = await subRes.json();
      const subs = subData.data?.currentAppInstallation?.activeSubscriptions || [];
      const activeSub = subs.find((s) => s.status === "ACTIVE");

      if (activeSub) {
        const planName = (activeSub.name || "").toLowerCase();
        let images_limit = 500;
        let plan_type = "starter";
        if (planName.includes("scale")) { images_limit = 10000; plan_type = "pro"; }
        else if (planName.includes("growth")) { images_limit = 1000; plan_type = "growth"; }
        console.log(`✅ Active subscription: "${activeSub.name}" → syncing`);
        await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop_domain: shopDomain, plan_name: plan_type, images_limit, reason: "loader_sync" }),
        }).catch(() => {});
      }
    }
  } catch (subErr) {
    console.warn("⚠️ Could not sync plan:", subErr.message);
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Fetch store details from Shopify GraphQL
  let shopEmail = session.email || `${shopDomain.split(".")[0]}@shopify.com`;
  let shopName = session.shop || shopDomain;

  try {
    const response = await admin.graphql(`
      query {
        shop {
          name
          email
          contactEmail
        }
      }
    `);
    const data = await response.json();
    if (data.data?.shop) {
      shopEmail =
        data.data.shop.contactEmail || data.data.shop.email || shopEmail;
      shopName = data.data.shop.name || shopName;
    }
  } catch (error) {
    console.error("⚠️ Could not fetch shop details from Shopify:", error);
  }

  // Fetch one real product for the onboarding demo (Step 3)
  let demoProduct = null;
  try {
    const productRes = await admin.graphql(`
      query {
        products(first: 1) {
          nodes {
            title
            priceRangeV2 {
              minVariantPrice { amount currencyCode }
            }
            featuredImage { url altText }
          }
        }
      }
    `);
    const productData = await productRes.json();
    const node = productData.data?.products?.nodes?.[0];
    if (node) {
      demoProduct = {
        title: node.title,
        price: `${node.priceRangeV2.minVariantPrice.currencyCode} ${parseFloat(node.priceRangeV2.minVariantPrice.amount).toFixed(2)}`,
        image: node.featuredImage?.url || null,
        imageAlt: node.featuredImage?.altText || node.title,
      };
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch demo product:", err.message);
  }

  // Check shop status from backend
  try {
    const response = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
    const data = await response.json();

    let predicted = null;
    try {
      const predRes = await fetch(
        `${backendUrl}/api/shop-status/${shopDomain}/predicted-impact`,
      );
      if (predRes.ok) {
        const predData = await predRes.json();
        predicted = predData.predicted || null;
      }
    } catch {
      /* non-critical */
    }

    // Auto-sync orders if needed (> 1 hour)
    const lastSyncTime = data.shopStatus?.order_sync?.last_sync_time;
    const oneHourAgo = Date.now() - 3600000;
    const isSyncing = data.shopStatus?.order_sync?.is_syncing;

    if (data.accountExists && !isSyncing) {
      if (!lastSyncTime || new Date(lastSyncTime).getTime() < oneHourAgo) {
        fetch(`${backendUrl}/api/sync-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_domain: shopDomain,
            session: { shop: session.shop, accessToken: session.accessToken },
          }),
        }).catch((err) => console.error("Auto-sync error:", err));
      }
    }

    return {
      shop: { domain: shopDomain, email: shopEmail, name: shopName },
      shopStatus: data.shopStatus || null,
      usage: data.usage || null,
      stats: data.stats || null,
      metrics: data.metrics || null,
      top_products: data.top_products || [],
      predicted: predicted,
      accountExists: data.accountExists || false,
      demoProduct,
    };
  } catch (error) {
    console.error("❌ Error checking shop status:", error);
    return {
      shop: { domain: shopDomain, email: shopEmail, name: shopName },
      shopStatus: null,
      usage: null,
      stats: null,
      metrics: null,
      top_products: [],
      predicted: null,
      accountExists: false,
      demoProduct,
    };
  }
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "createAccount") {
    const shopDomain = session.shop;
    let shopEmail = session.email || `${shopDomain.split(".")[0]}@shopify.com`;
    let shopName = session.shop || shopDomain;

    try {
      const response = await admin.graphql(`
        query { shop { name email contactEmail } }
      `);
      const data = await response.json();
      if (data.data?.shop) {
        shopEmail =
          data.data.shop.contactEmail || data.data.shop.email || shopEmail;
        shopName = data.data.shop.name || shopName;
      }
    } catch (error) {
      console.error("⚠️ Error fetching shop details:", error);
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${backendUrl}/api/merchant/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          shop_email: shopEmail,
          shop_name: shopName,
        }),
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "accountCreated" };
      }
      return {
        success: false,
        error: data.error || "Failed to create account",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  if (actionType === "savePhoneNumbers") {
    const shopDomain = formData.get("shop_domain");
    const phoneNumber = formData.get("phone_number");
    const whatsappNumber = formData.get("whatsapp_number");

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${backendUrl}/api/merchant/save-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          phone_number: phoneNumber,
          whatsapp_number: whatsappNumber,
        }),
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "phoneSaved" };
      }
      return {
        success: false,
        error: data.error || "Failed to save phone numbers",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  if (actionType === "saveCategories") {
    const shopDomain = formData.get("shop_domain");
    const categoriesValue = formData.get("categories");
    const categoryValue = formData.get("category");

    let categories = [];
    if (categoriesValue) {
      try {
        categories = JSON.parse(categoriesValue);
      } catch {
        categories = [];
      }
    } else if (categoryValue) {
      categories = [{ main_category: categoryValue, subcategories: [] }];
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(
        `${backendUrl}/api/merchant/save-categories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_domain: shopDomain,
            categories,
            category: categories[0]?.main_category || categoryValue,
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "categoriesSaved" };
      }
      return {
        success: false,
        error: data.error || "Failed to save categories",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  if (actionType === "updateAppStatus") {
    const shopDomain = formData.get("shop_domain");
    const status = formData.get("status");

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(
        `${backendUrl}/api/merchant/update-app-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop_domain: shopDomain, status }),
        },
      );
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "appStatusUpdated" };
      }
      return {
        success: false,
        error: data.error || "Failed to update app status",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  if (actionType === "syncOrders") {
    const shopDomain = session.shop;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${backendUrl}/api/sync-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          session: { shop: session.shop, accessToken: session.accessToken },
        }),
      });
      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          step: "ordersSynced",
          new_orders: data.new_orders,
          total_revenue: data.total_revenue,
        };
      }
      return { success: false, error: data.message || "Failed to sync orders" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false };
};

export default function DashboardIndex() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const shopify = useAppBridge();

  // App status and setup states
  const appStatus = loaderData.shopStatus?.app_status || "disabled";
  const isActive = appStatus === "active";
  const hasAccount = loaderData.accountExists;
  const hasCategory = Boolean(
    loaderData.shopStatus?.product_category ||
    loaderData.shopStatus?.product_categories?.length,
  );

  // Wizard Step State
  // 0: Welcome / Get Started
  // 1: Category Selection
  // 2: Phone / WhatsApp Contact
  // 3: Virtual Try-On Demo
  // 4: Add Button to Store
  // 5: Live confirmation / quick links
  // 6: Dashboard
  const [currentStep, setCurrentStep] = useState(() => {
    if (isActive) return 6;
    if (hasAccount && hasCategory) return 4;
    if (hasAccount) return 1;
    return 0;
  });
  // Once the dashboard has been opened, the completed setup steps stay locked.
  const [dashboardLocked, setDashboardLocked] = useState(isActive);
  // Track the highest step reached — can't go back once you pass a step
  const [maxStep, setMaxStep] = useState(() => {
    if (isActive) return 6;
    if (hasAccount && hasCategory) return 4;
    if (hasAccount) return 1;
    return 0;
  });

  const goToStep = (step) => {
    setCurrentStep(step);
    setMaxStep((prev) => Math.max(prev, step));
  };

  const openStep = (step) => {
    if (dashboardLocked || isActive) return;
    // Only allow going to steps already reached — no going back
    if (step > maxStep) return;
    setCurrentStep(step);
  };

  // Category selection state
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Contact details state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Try-on Demo State
  const demoProduct = loaderData.demoProduct || null;
  const [userPhoto, setUserPhoto] = useState(null);
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [demoStep, setDemoStep] = useState("idle"); // idle | generating | done | error
  const [genProgress, setGenProgress] = useState(0);
  const [genStageText, setGenStageText] = useState("");
  const [demoResultImage, setDemoResultImage] = useState(null);
  const [demoError, setDemoError] = useState(null);
  // Checklist items that tick off during generation (mirrors real popup screen 4)
  const [checklistDone, setChecklistDone] = useState([
    false,
    false,
    false,
    false,
  ]);

  // Date range metrics
  const [selectedDays, setSelectedDays] = useState(30);

  const isSubmitting = fetcher.state === "submitting";

  // Respond to action completion
  useEffect(() => {
    if (fetcher.data?.success) {
      if (fetcher.data.step === "accountCreated") {
        shopify.toast.show("Account created successfully!");
        goToStep(1); // Move to Categories
      } else if (fetcher.data.step === "categoriesSaved") {
        shopify.toast.show("Categories saved!");
        goToStep(2); // Move to Phone / WhatsApp
      } else if (fetcher.data.step === "phoneSaved") {
        shopify.toast.show("Contact details saved!");
        goToStep(3); // Move to Try-On Demo
      } else if (fetcher.data.step === "appStatusUpdated") {
        shopify.toast.show("App activated!");
        goToStep(5); // Show live confirmation and quick links
        setTimeout(() => revalidator.revalidate(), 1000);
      } else if (fetcher.data.step === "ordersSynced") {
        const newOrders = fetcher.data.new_orders || 0;
        shopify.toast.show(`✅ Synced ${newOrders} new orders!`);
        setTimeout(() => revalidator.revalidate(), 1200);
      }
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`, { isError: true });
    }
  }, [fetcher.data, shopify, revalidator]);

  // Open theme editor
  const openThemeEditor = () => {
    const params = new URLSearchParams({
      template: "product",
      context: "apps",
    });
    const themeEditorUrl = `https://${loaderData.shop.domain}/admin/themes/current/editor?${params.toString()}`;
    window.open(themeEditorUrl);
  };

  // Submit Account Creation
  const handleStartOnboarding = () => {
    fetcher.submit({ actionType: "createAccount" }, { method: "POST" });
  };

  // Submit Categories
  const handleSaveCategories = () => {
    if (!selectedCategories.length) {
      shopify.toast.show("Please select at least one category", {
        isError: true,
      });
      return;
    }
    fetcher.submit(
      {
        actionType: "saveCategories",
        categories: JSON.stringify(selectedCategories),
        shop_domain: loaderData.shop.domain,
      },
      { method: "POST" },
    );
  };

  // Submit Phone Numbers
  const handleSavePhone = () => {
    if (!phoneNumber.trim() || !whatsappNumber.trim()) {
      shopify.toast.show("Please enter both phone and WhatsApp numbers", {
        isError: true,
      });
      return;
    }
    fetcher.submit(
      {
        actionType: "savePhoneNumbers",
        shop_domain: loaderData.shop.domain,
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim(),
      },
      { method: "POST" },
    );
  };

  // Submit App Activation
  const handleConfirmActivation = () => {
    fetcher.submit(
      {
        actionType: "updateAppStatus",
        shop_domain: loaderData.shop.domain,
        status: "active",
      },
      { method: "POST" },
    );
  };

  // Submit Order Sync
  const handleSyncOrders = () => {
    fetcher.submit({ actionType: "syncOrders" }, { method: "POST" });
  };

  // Category Toggle Helper
  const toggleCategory = (mainCategory, allSubcategories = []) => {
    setSelectedCategories((current) => {
      const exists = current.find(
        (entry) => entry.main_category === mainCategory,
      );
      if (exists) {
        return current.filter((entry) => entry.main_category !== mainCategory);
      }
      const subKeys = allSubcategories.map((s) => s[0]);
      return [
        ...current,
        { main_category: mainCategory, subcategories: subKeys },
      ];
    });
  };

  // Try-On Demo File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUserPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserPhoto(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Run Real Demo Generation (calls backend directly, same as liquid)
  const runDemoGeneration = async () => {
    if (!userPhotoFile || !demoProduct) return;
    setDemoStep("generating");
    setDemoError(null);
    setDemoResultImage(null);
    setGenProgress(0);
    setGenStageText("Analyzing your photo...");
    setChecklistDone([false, false, false, false]);

    // Animate through loading stages while API runs in background
    const stages = [
      { text: "Analyzing your photo...", p: 15, delay: 0 },
      { text: "Mapping body position...", p: 32, delay: 1500 },
      { text: "Reading product details...", p: 50, delay: 4000 },
      { text: "Placing it on you...", p: 68, delay: 7500 },
      { text: "Finalizing the look...", p: 85, delay: 11000 },
    ];
    // Checklist ticks at staggered intervals (mirrors screen 4 of real popup)
    const checklistTimes = [3000, 6000, 9500, 13000];
    const timers = [
      ...stages.map(({ text, p, delay }) =>
        setTimeout(() => {
          setGenStageText(text);
          setGenProgress(p);
        }, delay),
      ),
      ...checklistTimes.map((delay, i) =>
        setTimeout(() => {
          setChecklistDone((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, delay),
      ),
    ];

    try {
      const formData = new FormData();
      formData.append("userImage", userPhotoFile);
      formData.append("shop_domain", loaderData.shop.domain);
      formData.append("product_name", demoProduct.title);
      formData.append("product_title", demoProduct.title);
      formData.append("session_id", `demo_onboarding_${Date.now()}`);
      if (demoProduct.image) {
        formData.append("product_image_url", demoProduct.image);
      }

      // Call backend directly — same URL as the liquid file uses
      const res = await fetch("https://seebeforebuy.in/api/generate-image", {
        method: "POST",
        body: formData,
      });

      timers.forEach(clearTimeout);
      // Tick all checklist items done before revealing result
      setChecklistDone([true, true, true, true]);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Image generation failed",
        );
      }

      setGenProgress(100);
      setGenStageText("Done!");
      setDemoResultImage(data.generated_image_url);
      setDemoStep("done");
    } catch (err) {
      timers.forEach(clearTimeout);
      console.error("Demo generation error:", err);
      setDemoError(err.message || "Generation failed. Please try again.");
      setDemoStep("error");
    }
  };

  // Time since sync helper
  const getTimeSinceSync = () => {
    const lastSyncTime = loaderData.shopStatus?.order_sync?.last_sync_time;
    if (!lastSyncTime) return "Never";
    const diffMins = Math.floor(
      (Date.now() - new Date(lastSyncTime).getTime()) / 60000,
    );
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  return (
    <div className={styles.appContainer}>
      {/* TOP BAR */}
      <div className={styles.topBar}>
        <div className={styles.tbLogo}>
          <div className={styles.tbIcon}>SBB</div>
          <span className={styles.tbName}>See Before Buy AI</span>
        </div>
        <div className={styles.tbStore}>
          <span className={styles.tbDot} />
          {loaderData.shop.domain}
        </div>
        <div className={styles.tbRight}>
          <span className={styles.tbCredits}>
            {loaderData.usage
              ? `${loaderData.usage.limit - loaderData.usage.used} credits left`
              : "50 free credits"}
          </span>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className={styles.layout}>
        {/* LEFT SIDEBAR (WIZARD STEPS) */}
        <div className={styles.sidebar}>
          <div className={styles.ssLabel}>Setup in 1 minute</div>

          <div
            className={`${styles.stepItem} ${currentStep === 0 ? styles.stepAct : ""} ${currentStep > 0 ? styles.stepDone : ""}`}
            onClick={() => openStep(0)}
          >
            <div className={styles.siDot}>{currentStep > 0 ? "✓" : "1"}</div>
            <div className={styles.siLabel}>Get Started</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 1 ? styles.stepAct : ""} ${currentStep > 1 ? styles.stepDone : ""}`}
            onClick={() => hasAccount && openStep(1)}
          >
            <div className={styles.siDot}>{currentStep > 1 ? "✓" : "2"}</div>
            <div className={styles.siLabel}>Categories</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 2 ? styles.stepAct : ""} ${currentStep > 2 ? styles.stepDone : ""}`}
            onClick={() => hasAccount && openStep(2)}
          >
            <div className={styles.siDot}>{currentStep > 2 ? "✓" : "3"}</div>
            <div className={styles.siLabel}>Contact info</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 3 ? styles.stepAct : ""} ${currentStep > 3 ? styles.stepDone : ""}`}
            onClick={() => hasAccount && openStep(3)}
          >
            <div className={styles.siDot}>{currentStep > 3 ? "✓" : "4"}</div>
            <div className={styles.siLabel}>Try it on</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 4 ? styles.stepAct : ""} ${isActive ? styles.stepDone : ""}`}
            onClick={() => hasAccount && openStep(4)}
          >
            <div className={styles.siDot}>{isActive ? "✓" : "5"}</div>
            <div className={styles.siLabel}>Add button</div>
          </div>
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className={styles.mainArea}>
          {/* ════ SCREEN 0: WELCOME / HERO ════ */}
          {currentStep === 0 && (
            <div className={styles.panel}>
              <div className={styles.welcomeHero}>
                <div className={styles.wsEyebrow}>
                  ✦ AI Virtual Try-On for Shopify
                </div>
                <h1 className={styles.heroTitle}>
                  Let shoppers see themselves in your products —{" "}
                  <span>before they buy</span>
                </h1>
                <p className={styles.heroSubtitle}>
                  Boost conversions by +72% and reduce returns. 50 free try-ons
                  included. Setup takes under 3 minutes.
                </p>

                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                  <button
                    className={styles.tealButton}
                    onClick={handleStartOnboarding}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Setting up account..."
                      : "Get Started Now →"}
                  </button>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#9CA3AF",
                      marginTop: "18px",
                    }}
                  >
                    No credit card required · Free 50 try-on credits
                  </p>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.statBox}>
                    <div className={styles.statVal}>+72%</div>
                    <div className={styles.statLbl}>Conversion lift</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statVal}>-32%</div>
                    <div className={styles.statLbl}>Return rate drop</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statVal}>30s</div>
                    <div className={styles.statLbl}>Try-on speed</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statVal}>50</div>
                    <div className={styles.statLbl}>Free credits</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ SCREEN 1: CATEGORY SELECTION ════ */}
          {currentStep === 1 && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.phEyebrow}>Step 1 of 4</div>
                <div className={styles.phTitle}>
                  Select Your Product Categories
                </div>
                <div className={styles.phSub}>
                  Select the product categories you sell. Our AI model adapts to
                  these garments.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.categoryGrid}>
                  {[
                    {
                      value: "indo_western",
                      label: "Indo Western",
                      examples:
                        "Jacket kurti, fusion dress, dhoti pant, crop top lehenga",
                      subcategories: [
                        ["jacket_kurti", "Jacket Kurti"],
                        ["crop_top_lehenga", "Crop Top Lehenga"],
                      ],
                    },
                    {
                      value: "party_wear",
                      label: "Party Wear",
                      examples:
                        "Cocktail dress, evening gown, designer lehenga",
                      subcategories: [
                        ["party_saree", "Party Saree"],
                        ["designer_lehenga", "Designer Lehenga"],
                      ],
                    },
                    {
                      value: "winter_wear",
                      label: "Winter Wear",
                      examples:
                        "Puffer jacket, hoodie, sweater, leather jacket",
                      subcategories: [
                        ["hoodie", "Hoodie"],
                        ["sweater", "Sweater"],
                      ],
                    },
                    {
                      value: "casual",
                      label: "Casual Wear",
                      examples: "T-shirts, polo shirts, kurtis, daily sarees",
                      subcategories: [
                        ["tshirt", "T-Shirt"],
                        ["kurti", "Kurti"],
                      ],
                    },
                    {
                      value: "watch",
                      label: "Watches",
                      examples: "Wristwatches, smartwatches, luxury timepieces",
                      subcategories: [],
                    },
                    {
                      value: "jewellery",
                      label: "Jewellery",
                      examples: "Rings, necklaces, earrings, bangles",
                      subcategories: [
                        ["ring", "Ring"],
                        ["necklace", "Necklace"],
                      ],
                    },
                    {
                      value: "activewear",
                      label: "Activewear & Gym Wear",
                      examples:
                        "Compression wear, sports bra, joggers, tracksuit",
                      subcategories: [
                        ["sports_bra", "Sports Bra"],
                        ["jogger_pants", "Jogger Pants"],
                      ],
                    },
                    {
                      value: "headwear_caps",
                      label: "Headwear & Caps",
                      examples: "Baseball cap, snapback, trucker hat, beanie",
                      subcategories: [],
                    },
                  ].map((cat) => {
                    const isSelected = Boolean(
                      selectedCategories.find(
                        (c) => c.main_category === cat.value,
                      ),
                    );
                    return (
                      <div
                        key={cat.value}
                        className={`${styles.catCard} ${isSelected ? styles.catCardOn : ""}`}
                        onClick={() =>
                          toggleCategory(cat.value, cat.subcategories)
                        }
                      >
                        <div className={styles.catCheck}>
                          {isSelected ? "✓" : ""}
                        </div>
                        <div>
                          <div className={styles.catName}>{cat.label}</div>
                          <div className={styles.catHint}>{cat.examples}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={styles.panelFoot}>
                <span style={{ fontSize: "12px", color: "#6B7280" }}>
                  <b style={{ color: "#008060" }}>
                    {selectedCategories.length}
                  </b>{" "}
                  category selected
                </span>
                <button
                  className={styles.tealButton}
                  onClick={handleSaveCategories}
                  disabled={isSubmitting || !selectedCategories.length}
                >
                  {isSubmitting ? "Saving..." : "Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* ════ SCREEN 2: PHONE & WHATSAPP ════ */}

          {currentStep === 2 && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.phEyebrow}>Step 2 of 4</div>
                <div className={styles.phTitle}>Get alerts on WhatsApp</div>
                <div className={styles.phSub}>
                  Know the moment a shopper tries on your product.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div style={{ maxWidth: "580px", margin: "0 auto" }}>
                  <div className={styles.waAlertBanner}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.7)",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Alerts you'll receive
                    </div>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.25)",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                    >
                      <p> First try-on on your store!</p>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#ffffff",
                          marginTop: "4px",
                        }}
                      >
                        We'll send you a WhatsApp message when a shopper tries
                        on your product.
                      </p>
                    </div>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.25)",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        color: "#ffffff",
                        fontSize: "12px",
                        marginTop: "12px",
                      }}
                    >
                      <p>80% of credits used</p>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#ffffff",
                          marginTop: "4px",
                        }}
                      >
                        Upgrade to keep your button live all month
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      Phone Number <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.textInput}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      WhatsApp Number{" "}
                      <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.textInput}
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>
              <div className={styles.panelFoot}>
                <button
                  className={styles.tealButton}
                  onClick={handleSavePhone}
                  disabled={
                    isSubmitting ||
                    !phoneNumber.trim() ||
                    !whatsappNumber.trim()
                  }
                >
                  {isSubmitting ? "Saving..." : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* ════ SCREEN 3: VIRTUAL TRY-ON DEMO ════ */}
          {currentStep === 3 && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.phEyebrow}>
                  Step 3 of 4 — The best part
                </div>
                <div className={styles.phTitle}>
                  See it work on your products
                </div>
                <div className={styles.phSub}>
                  Upload a photo → click Generate → see your shopper wearing
                  your actual product in seconds.
                </div>
              </div>

              <div className={styles.panelBody}>
                <div className={styles.tryonGrid}>
                  {/* ── Left Column ── */}
                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      {/* Product card */}
                      <div>
                        <div className={styles.tgHead}>1. Your product</div>
                        {demoProduct ? (
                          <div
                            className={`${styles.prodThumb} ${styles.prodThumbOn}`}
                            style={{ cursor: "default" }}
                          >
                            {demoProduct.image ? (
                              <img
                                src={demoProduct.image}
                                alt={demoProduct.imageAlt}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  aspectRatio: "1",
                                  background: "#F3F4F6",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "32px",
                                  borderRadius: "8px",
                                }}
                              >
                                🛍️
                              </div>
                            )}
                            <div className={styles.ptName}>
                              {demoProduct.title}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#008060",
                                fontWeight: 700,
                                marginTop: "2px",
                              }}
                            >
                              {demoProduct.price}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={styles.prodThumb}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              color: "#9CA3AF",
                              minHeight: "120px",
                            }}
                          >
                            No products found
                          </div>
                        )}
                      </div>

                      {/* Upload box */}
                      <div>
                        <div className={styles.tgHead}>
                          2. Upload Model Photo
                        </div>
                        <div
                          className={`${styles.uploadBox} ${userPhoto ? styles.uploadBoxHas : ""}`}
                          onClick={() =>
                            document.getElementById("demo-file-input").click()
                          }
                        >
                          <input
                            type="file"
                            id="demo-file-input"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleFileUpload}
                          />
                          {userPhoto ? (
                            <img
                              src={userPhoto}
                              alt="Uploaded"
                              className={styles.uploadPreviewImg}
                            />
                          ) : (
                            <div>
                              <div
                                style={{
                                  fontSize: "24px",
                                  marginBottom: "4px",
                                }}
                              >
                                📸
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#4B5563",
                                }}
                              >
                                Click to upload
                              </div>
                              <div
                                style={{ fontSize: "10px", color: "#9CA3AF" }}
                              >
                                Full body · Front facing
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      className={styles.tealButton}
                      style={{ width: "100%", marginTop: "16px" }}
                      disabled={
                        !userPhoto || !demoProduct || demoStep === "generating"
                      }
                      onClick={runDemoGeneration}
                    >
                      {demoStep === "generating"
                        ? "Generating..."
                        : "✨ Generate Virtual Try-On"}
                    </button>

                    {demoStep === "error" && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px 14px",
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#DC2626",
                        }}
                      >
                        ⚠️ {demoError}
                      </div>
                    )}
                  </div>

                  {/* ── Right Column: Result (inside a phone frame) ── */}
                  <div>
                    <div className={styles.tgHead}>Try-On Result</div>

                    {/* ── Phone frame wrapper ── */}
                    <div className={styles.phoneFrame}>
                      <div className={styles.phoneNotch} />
                      <div className={styles.phoneScreen}>
                        {/* Idle state */}
                        {demoStep === "idle" && (
                          <div
                            style={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                padding: "16px 14px 10px",
                                fontSize: "10px",
                                fontWeight: 800,
                                color: "#111827",
                              }}
                            >
                              Product preview
                            </div>
                            <div
                              style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "12px 18px",
                              }}
                            >
                              {demoProduct?.image ? (
                                <img
                                  src={demoProduct.image}
                                  alt={demoProduct.title}
                                  style={{
                                    width: "100%",
                                    height: "190px",
                                    objectFit: "contain",
                                    borderRadius: "10px",
                                    marginBottom: "14px",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    fontSize: "28px",
                                    marginBottom: "14px",
                                  }}
                                >
                                  ✨
                                </div>
                              )}
                              <div
                                style={{
                                  width: "100%",
                                  fontSize: "12px",
                                  fontWeight: 800,
                                  color: "#111827",
                                  textAlign: "center",
                                  marginBottom: "5px",
                                }}
                              >
                                {demoProduct?.title || "Your product"}
                              </div>
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#6B7280",
                                  textAlign: "center",
                                }}
                              >
                                See how it looks on you
                              </div>
                            </div>
                            <div style={{ padding: "12px 14px 16px" }}>
                              <button
                                className={styles.tealButton}
                                onClick={runDemoGeneration}
                                style={{ width: "100%", fontSize: "11px" }}
                              >
                                ✨ Try the Look
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Generating state — spinner + stage text + progress + two-card + checklist */}
                        {demoStep === "generating" && (
                          <div className={styles.phoneGenerating}>
                            {/* Two-card visual */}
                            <div
                              className={styles.demoCardPair}
                              style={{ position: "relative" }}
                            >
                              {demoProduct?.image && (
                                <div className={styles.demoCardProduct}>
                                  <img
                                    src={demoProduct.image}
                                    alt={demoProduct.title}
                                  />
                                </div>
                              )}
                              <div>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  width="12"
                                  height="12"
                                >
                                  <path d="M21 2v6h-6" />
                                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                  <path d="M3 22v-6h6" />
                                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                                </svg>
                              </div>
                              {userPhoto && (
                                <div className={styles.demoCardUser}>
                                  <img src={userPhoto} alt="You" />
                                </div>
                              )}
                            </div>

                            {/* Stage title + progress */}
                            <div
                              style={{
                                textAlign: "center",
                                marginBottom: "8px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  color: "#111827",
                                  marginBottom: "3px",
                                }}
                              >
                                {genStageText}
                              </div>
                              <div
                                style={{ fontSize: "9px", color: "#9CA3AF" }}
                              >
                                AI is working on your try-on
                              </div>
                            </div>
                            <div className={styles.demoProgressTrack}>
                              <div
                                className={styles.demoProgressFill}
                                style={{
                                  width: `${genProgress}%`,
                                  transition: "width 0.8s ease",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#9CA3AF",
                                textAlign: "center",
                                margin: "4px 0 10px",
                              }}
                            >
                              {genProgress}%
                            </div>

                            {/* Checklist (mirrors screen 4 of real popup) */}
                            <div className={styles.demoChecklist}>
                              {[
                                {
                                  label: "Lighting matched",
                                  desc: "Ambient light blended",
                                },
                                {
                                  label: "Analysing photo",
                                  desc: "Folds and weight rendered",
                                },
                                {
                                  label: "Shadow depth set",
                                  desc: "Natural shadows added",
                                },
                                {
                                  label: "Identity preserved",
                                  desc: "Face unchanged ✓",
                                },
                              ].map((item, i) => (
                                <div
                                  key={i}
                                  className={`${styles.demoCheckRow} ${checklistDone[i] ? styles.demoCheckDone : styles.demoCheckPending}`}
                                >
                                  <div className={styles.demoCheckIcon}>
                                    {checklistDone[i] ? (
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        width="10"
                                        height="10"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    ) : (
                                      <div className={styles.demoCheckDot} />
                                    )}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div className={styles.demoCheckLabel}>
                                      {item.label}
                                    </div>
                                    <div className={styles.demoCheckDesc}>
                                      {item.desc}
                                    </div>
                                  </div>
                                  {checklistDone[i] && (
                                    <div className={styles.demoCheckBadge}>
                                      done
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Error state */}
                        {demoStep === "error" && (
                          <div className={styles.phoneIdle}>
                            <div
                              style={{ fontSize: "28px", marginBottom: "6px" }}
                            >
                              😕
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#6B7280",
                              }}
                            >
                              Generation failed
                            </div>
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#DC2626",
                                marginTop: "4px",
                                padding: "0 8px",
                                textAlign: "center",
                              }}
                            >
                              {demoError}
                            </div>
                          </div>
                        )}

                        {/* Done — Screen 5 style inside phone */}
                        {demoStep === "done" && demoResultImage && (
                          <div className={styles.phoneResult}>
                            {/* Dark image area */}
                            <div className={styles.phoneResultImageArea}>
                              {/* Gradient header overlay */}
                              <div className={styles.phoneResultOverlay}>
                                <div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      color: "#fff",
                                    }}
                                  >
                                    Your Try-On
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "8px",
                                      color: "rgba(255,255,255,0.6)",
                                    }}
                                  >
                                    AI generated
                                  </div>
                                </div>
                                <div
                                  style={{
                                    background: "#059669",
                                    color: "#fff",
                                    fontSize: "8px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                  }}
                                >
                                  ✓ Ready
                                </div>
                              </div>
                              {/* Result image */}
                              <img
                                src={demoResultImage}
                                alt="AI Try-On Result"
                                className={styles.phoneResultImg}
                              />
                              {/* PiP thumbnail */}
                              {demoProduct?.image && (
                                <div className={styles.phoneResultPip}>
                                  <img
                                    src={demoProduct.image}
                                    alt={demoProduct.title}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* White bottom sheet */}
                            <div className={styles.phoneResultSheet}>
                              <div className={styles.phoneSheetHandle} />
                              <div className={styles.phoneSheetProductName}>
                                {demoProduct?.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#6B7280",
                                  marginBottom: "8px",
                                }}
                              >
                                This is what your shoppers see ✨
                              </div>
                              {/* Add to Card Buttion , Donwload image and share Icons  */}
                              <div>
                                <button
                                  className={styles.tealButton}
                                  style={{ width: "100%", marginBottom: "8px" }}
                                >
                                  Add to Cart
                                </button>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                  }}
                                >
                                  <button
                                    className={styles.btnGhost}
                                    style={{ flex: 1 }}
                                  >
                                    {/* icons */}
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      width="12"
                                      height="12"
                                      aria-label="Download image"
                                    >
                                      <path d="M12 3v12" />
                                      <path d="m7 10 5 5 5-5" />
                                      <path d="M5 21h14" />
                                    </svg>
                                  </button>
                                  <button
                                    className={styles.btnGhost}
                                    style={{ flex: 1 }}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      width="12"
                                      height="12"
                                      aria-label="Share image"
                                    >
                                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                      <path d="M16 6a4 4 0 0 1-4-4" />
                                      <path d="M16.59 13.59L7.41 4.41" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <button
                                className={styles.phoneSheetRetry}
                                onClick={() => {
                                  setDemoStep("idle");
                                  setDemoResultImage(null);
                                  setUserPhoto(null);
                                  setUserPhotoFile(null);
                                  setChecklistDone([
                                    false,
                                    false,
                                    false,
                                    false,
                                  ]);
                                }}
                              >
                                Try another photo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.phoneHomeBar} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.panelFoot}>
                <button
                  className={styles.tealButton}
                  onClick={() => {
                    setCurrentStep(4);
                    setMaxStep((prev) => Math.max(prev, 4));
                  }}
                  disabled={demoStep !== "done"}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ════ SCREEN 4: ADD BUTTON TO STORE ════ */}
          {currentStep === 4 && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.phEyebrow}>Step 4 of 4</div>
                <div className={styles.phTitle}>
                  Add "Try the Look" Button to Theme
                </div>
                <div className={styles.phSub}>
                  Follow the video guide below to place the try-on button on
                  your product pages.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <video
                    src="https://cdn.shopify.com/videos/c/o/v/8d3ec3a22a01482ca376ea8d8b7b6b0b.mp4"
                    controls
                    style={{
                      maxWidth: "580px",
                      width: "100%",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                    }}
                  />
                </div>

                <div className={styles.installSteps}>
                  <div className={styles.isRow}>
                    <div className={styles.isNum}>1</div>
                    <div>
                      <div className={styles.isTitle}>
                        Click "Open Theme Editor" below
                      </div>
                      <div className={styles.isSub}>
                        It opens your Shopify Product Page template in a new
                        tab.
                      </div>
                    </div>
                  </div>
                  <div className={styles.isRow}>
                    <div className={styles.isNum}>2</div>
                    <div>
                      <div className={styles.isTitle}>
                        Add block → Apps → "Try the Look"
                      </div>
                      <div className={styles.isSub}>
                        Drag the block below your Add to Cart button.
                      </div>
                    </div>
                  </div>
                  <div className={styles.isRow}>
                    <div className={styles.isNum}>3</div>
                    <div>
                      <div className={styles.isTitle}>
                        Click Save in top right
                      </div>
                      <div className={styles.isSub}>
                        Your button goes live instantly for all shoppers.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.panelFoot}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className={styles.btnGhost}
                    style={{ border: "1px solid #E5E7EB" }}
                    onClick={openThemeEditor}
                  >
                    Open Theme Editor
                  </button>
                  <button
                    className={styles.tealButton}
                    onClick={handleConfirmActivation}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Activating..." : "✓ I've Added the Block"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Screen 5: live confirmation and quick links */}
          {currentStep === 5 && (
            <div
              className={styles.panel}
              style={{ maxWidth: "620px", margin: "40px auto" }}
            >
              <div
                className={styles.panelBody}
                style={{ textAlign: "center", padding: "48px 32px" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>✓</div>
                <div className={styles.phTitle}>🎉 You're live!</div>
                <div className={styles.phSub} style={{ margin: "12px 0 28px" }}>
                  Try The Look is now active on all your product pages.
                  <br />
                  What do you want to do next?
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className={styles.btnGhost}
                    onClick={() => {
                      navigate("/app/settings");
                      setDashboardLocked(true);
                    }}
                  >
                    Customize button
                  </button>
                  <button
                    className={styles.tealButton}
                    onClick={() => {
                      setDashboardLocked(true);
                      setCurrentStep(6);
                    }}
                  >
                    Go to dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ SCREEN 6: MAIN DASHBOARD ════ */}
          {currentStep === 6 && (
            <div>
              {/* Top Summary Bar */}
              <div
                className={styles.statsCard}
                style={{ marginBottom: "20px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "22px",
                        fontWeight: 800,
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      Store Performance
                    </h2>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#6B7280",
                        margin: "4px 0 0",
                      }}
                    >
                      Last order sync: {getTimeSinceSync()}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusDisabled}`}
                    >
                      {isActive ? " Active" : " Inactive"}
                    </div>
                    <button
                      className={styles.tealButton}
                      onClick={handleSyncOrders}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Syncing..." : " Sync Orders"}
                    </button>
                  </div>
                </div>

                {/* Date Filter */}
                <div className={styles.dateRangeBar}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#4B5563",
                    }}
                  >
                    Period:
                  </span>
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      className={`${styles.dateBtn} ${selectedDays === d ? styles.dateBtnActive : ""}`}
                      onClick={() => setSelectedDays(d)}
                    >
                      Last {d} Days
                    </button>
                  ))}
                </div>

                {/* Metrics Grid */}
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Try-Ons Generated</div>
                    <div className={styles.statValue}>
                      {loaderData.metrics?.try_on_generated || 0}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Unique Users</div>
                    <div className={styles.statValue}>
                      {loaderData.metrics?.unique_users || 0}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Add to Cart Rate</div>
                    <div className={styles.statValue}>
                      {loaderData.metrics?.add_to_cart_rate || 0}%
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Total Revenue</div>
                    <div
                      className={styles.statValue}
                      style={{ color: "#008060" }}
                    >
                      ₹{loaderData.metrics?.total_revenue?.toFixed(2) || "0.00"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Token / Usage Details */}
              <div
                className={styles.statsCard}
                style={{ marginBottom: "20px" }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    marginBottom: "16px",
                  }}
                >
                  Plan & Credit Usage
                </h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Plan Type</div>
                    <div className={styles.statValue}>
                      {loaderData.shopStatus?.plan_type || "Free Trial"}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Credits Remaining</div>
                    <div className={styles.statValue}>
                      {loaderData.metrics?.credit_remaining || 0}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Credits Used</div>
                    <div className={styles.statValue}>
                      {loaderData.metrics?.credit_used || 0}
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Monthly Limit</div>
                    <div className={styles.statValue}>
                      {loaderData.usage?.limit || 50}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 Products Table */}
              {loaderData.top_products &&
                loaderData.top_products.length > 0 && (
                  <div className={styles.statsCard}>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        marginBottom: "16px",
                      }}
                    >
                      Top Products by Try-On
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                fontSize: "12px",
                                color: "#6B7280",
                              }}
                            >
                              Product Name
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                fontSize: "12px",
                                color: "#6B7280",
                              }}
                            >
                              Try-Ons
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                fontSize: "12px",
                                color: "#6B7280",
                              }}
                            >
                              ATC Rate
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "center",
                                fontSize: "12px",
                                color: "#6B7280",
                              }}
                            >
                              ATC Count
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {loaderData.top_products.map((prod, idx) => (
                            <tr
                              key={idx}
                              style={{ borderBottom: "1px solid #F3F4F6" }}
                            >
                              <td
                                style={{
                                  padding: "10px",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                }}
                              >
                                {prod.product_name}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  textAlign: "center",
                                  fontSize: "13px",
                                  color: "#008060",
                                  fontWeight: 700,
                                }}
                              >
                                {prod.try_on_count}
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  textAlign: "center",
                                  fontSize: "13px",
                                }}
                              >
                                {prod.conversion_rate}%
                              </td>
                              <td
                                style={{
                                  padding: "10px",
                                  textAlign: "center",
                                  fontSize: "13px",
                                }}
                              >
                                {prod.add_to_cart_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
