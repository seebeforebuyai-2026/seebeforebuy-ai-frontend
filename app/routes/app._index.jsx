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


  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    const statusRes = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
    const statusData = await statusRes.json();
    const installStatus = statusData?.shopStatus?.install_status;
    const backendPlanType = statusData?.shopStatus?.plan_type || "free";

    if (installStatus === "uninstalled" || installStatus === "reinstalled") {
      // ── REINSTALL PATH ────────────────────────────────────────────────────
      // "uninstalled"  → set by app/uninstalled webhook
      // "reinstalled"  → set by app/installed webhook (shop already existed)
      // Both mean: merchant no longer has a valid paid subscription.
      console.log(`🔄 Reinstall detected (flag="${installStatus}"): ${shopDomain} → cancelling subscription + forcing free`);

      // Cancel any active Shopify subscription using the live admin session.
      // Shopify keeps subscriptions ACTIVE after uninstall — we must cancel manually.
      try {
        const subRes = await admin.graphql(`
          query { currentAppInstallation { activeSubscriptions { id name status } } }
        `);
        const subData = await subRes.json();
        const subs = subData.data?.currentAppInstallation?.activeSubscriptions || [];
        for (const sub of subs) {
          if (sub.status === "ACTIVE") {
            console.log(`🚫 Cancelling subscription: ${sub.id} (${sub.name})`);
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

      // Clear the install_status flag so future loads go to the normal path
      await fetch(`${backendUrl}/api/mark-uninstalled`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_domain: shopDomain }),
      }).catch(() => {});

      console.log(`✅ ${shopDomain} → subscription cancelled, plan=free, flag cleared`);

    } else {
      // ── NORMAL LOAD PATH ──────────────────────────────────────────────────
      // Only sync the Shopify subscription if the backend ALREADY has this shop
      // on a paid plan. This is the critical guard: if the backend says "free",
      // we trust the backend and do NOT let a stale Shopify ACTIVE subscription
      // override it. A stale ACTIVE subscription is expected after reinstall
      // because Shopify does not auto-cancel subscriptions on uninstall.
      if (backendPlanType === "free") {
        console.log(`ℹ️  ${shopDomain} is on free plan in backend — skipping Shopify subscription sync`);
      } else {
        // Backend has a paid plan — verify it is still active on Shopify's side
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
          console.log(`✅ Active subscription confirmed: "${activeSub.name}" → syncing`);
          await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop_domain: shopDomain, plan_name: plan_type, images_limit, reason: "loader_sync" }),
          }).catch(() => {});
        } else {
          // Backend says paid but Shopify has no active subscription → downgrade to free
          console.log(`⬇️  ${shopDomain}: backend=${backendPlanType} but no active Shopify subscription → resetting to free`);
          await fetch(`${backendUrl}/api/reset-plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shop_domain: shopDomain,
              admin_secret: process.env.ADMIN_SECRET || "sbb-admin-reset-2024",
            }),
          }).catch(() => {});
        }
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

    // Keep validation server-side as well; client-side restrictions can be bypassed.
    const phoneDigits = String(phoneNumber || "").replace(/\D/g, "");
    const whatsappDigits = String(whatsappNumber || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(phoneDigits) || !/^\d{10}$/.test(whatsappDigits)) {
      return {
        success: false,
        error: "Phone and WhatsApp numbers must each contain exactly 10 digits",
      };
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${backendUrl}/api/merchant/save-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          phone_number: phoneDigits,
          whatsapp_number: whatsappDigits,
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

  const [phonePrefix, setPhonePrefix] = useState("+91");
const [sameAsPhone, setSameAsPhone] = useState(true);
const [previewTab, setPreviewTab] = useState("first"); // 'first' | 'credits'
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
    if (!/^\d{10}$/.test(phoneNumber) || !/^\d{10}$/.test(whatsappNumber)) {
      shopify.toast.show("Enter exactly 10 digits for both numbers", {
        isError: true,
      });
      return;
    }
    fetcher.submit(
      {
        actionType: "savePhoneNumbers",
        shop_domain: loaderData.shop.domain,
        phone_number: phoneNumber,
        whatsapp_number: whatsappNumber,
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
  <div className="sbb-wa-container">
    {/* Scoped CSS styles to prevent overlapping with any app styles */}
    <style>{`
      .sbb-wa-container {
        max-width: 960px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .sbb-wa-main {
        display: flex;
        flex-direction: row;
        min-height: 560px;
      }
      @media (max-width: 860px) {
        .sbb-wa-main {
          flex-direction: column;
        }
      }
      /* Left Form Side */
      .sbb-wa-form-side {
        flex: 1;
        padding: 28px 32px;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
      }
      .sbb-wa-eyebrow {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #008060;
        margin-bottom: 6px;
      }
      .sbb-wa-title {
        font-size: 22px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.025em;
        margin-bottom: 5px;
      }
      .sbb-wa-sub {
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
        margin-bottom: 24px;
      }
      .sbb-wa-divider {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 16px 0;
      }
      .sbb-wa-divider-line {
        flex: 1;
        height: 1px;
        background: #e2e8f0;
      }
      .sbb-wa-divider-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: #64748b;
      }
      .sbb-wa-field {
        margin-bottom: 16px;
      }
      .sbb-wa-field-label {
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .sbb-wa-field-label .req {
        color: #ef4444;
      }
      .sbb-wa-phone-row {
        display: flex;
        gap: 8px;
      }
      .sbb-wa-phone-prefix {
        background: #f1f5f9;
        border: 1.5px solid #cbd5e1;
        border-radius: 9px;
        padding: 10px 12px;
        font-size: 14px;
        color: #0f172a;
        font-weight: 600;
        outline: none;
        width: 82px;
        flex-shrink: 0;
        cursor: pointer;
      }
      .sbb-wa-field-input {
        width: 100%;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 9px;
        padding: 10px 14px;
        font-size: 14px;
        color: #0f172a;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .sbb-wa-field-input:focus {
        border-color: #008060;
        box-shadow: 0 0 0 3px rgba(0, 128, 96, 0.08);
      }
      .sbb-wa-field-hint {
        font-size: 11px;
        color: #64748b;
        margin-top: 5px;
      }
      /* Toggle Checkbox */
      .sbb-wa-same-number {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 9px;
        padding: 12px 14px;
        cursor: pointer;
        margin-bottom: 16px;
        user-select: none;
        transition: all 0.15s ease;
      }
      .sbb-wa-same-number:hover {
        background: #f1f5f9;
      }
      .sbb-wa-same-number.checked {
        border-color: #008060;
        background: #ecfdf5;
      }
      .sbb-wa-checkbox {
        width: 18px;
        height: 18px;
        border-radius: 5px;
        border: 2px solid #cbd5e1;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        color: #ffffff;
        flex-shrink: 0;
        margin-top: 1px;
        transition: all 0.15s;
      }
      .sbb-wa-same-number.checked .sbb-wa-checkbox {
        background: #008060;
        border-color: #008060;
      }
      .sbb-wa-sn-label {
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
      }
      .sbb-wa-sn-sub {
        font-size: 11px;
        color: #64748b;
        margin-top: 2px;
      }
      /* Alert Trigger Cards */
      .sbb-wa-alert-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 13px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .sbb-wa-alert-card:hover, .sbb-wa-alert-card.active {
        border-color: #008060;
        background: #ecfdf5;
      }
      .sbb-wa-privacy-note {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        background: #f8fafc;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
        margin-top: 8px;
        margin-bottom: 20px;
      }
      .sbb-wa-form-foot {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid #e2e8f0;
      }
      .sbb-wa-btn-save {
        background: #25D366;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 11px 24px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 10px rgba(37, 211, 102, 0.25);
      }
      .sbb-wa-btn-save:hover:not(:disabled) {
        background: #128C7E;
        transform: translateY(-1px);
      }
      .sbb-wa-btn-save:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        box-shadow: none;
      }
      /* Right WhatsApp Preview Side */
      .sbb-wa-preview-side {
        width: 340px;
        flex-shrink: 0;
        background: #f0f0f0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-left: 1px solid #e2e8f0;
      }
      .sbb-wa-preview-label {
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(4px);
        padding: 6px 14px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.75);
        text-align: center;
      }
      .sbb-wa-header {
        background: #075E54;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ffffff;
      }
      .sbb-wa-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #25D366;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      .sbb-wa-info { flex: 1; }
      .sbb-wa-name { font-size: 13px; font-weight: 700; color: #ffffff; }
      .sbb-wa-status { font-size: 11px; color: rgba(255, 255, 255, 0.65); }
      .sbb-wa-tabs {
        display: flex;
        background: #075E54;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      }
      .sbb-wa-tab {
        flex: 1;
        padding: 8px;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.45);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.15s;
      }
      .sbb-wa-tab.on {
        color: #ffffff;
        border-bottom-color: #25D366;
      }
      .sbb-wa-body {
        flex: 1;
        overflow-y: auto;
        background-color: #ECE5DD;
        background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c4b8a8' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        padding: 12px 10px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .sbb-wa-date-badge {
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(4px);
        border-radius: 100px;
        padding: 3px 10px;
        font-size: 11px;
        color: #075E54;
        font-weight: 600;
        text-align: center;
        align-self: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }
      .sbb-wa-bubble {
        max-width: 88%;
        background: #ffffff;
        border-radius: 8px;
        padding: 10px 12px 6px;
        position: relative;
        align-self: flex-start;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      }
      .sbb-wa-bubble::before {
        content: '';
        position: absolute;
        top: 0;
        left: -7px;
        border: 6px solid transparent;
        border-top-color: #ffffff;
        border-right-color: #ffffff;
      }
      .sbb-wa-app-row {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 128, 96, 0.06);
        border-radius: 6px;
        padding: 7px 9px;
        margin-bottom: 8px;
      }
      .sbb-wa-app-icon {
        width: 24px;
        height: 24px;
        border-radius: 5px;
        background: #008060;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 800;
      }
      .sbb-wa-app-name { font-size: 11px; font-weight: 700; color: #008060; }
      .sbb-wa-app-sub { font-size: 10px; color: #64748b; }
      .sbb-wa-alert-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(37, 211, 102, 0.12);
        border: 1px solid rgba(37, 211, 102, 0.25);
        border-radius: 4px;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 700;
        color: #0f8c44;
        margin-bottom: 7px;
      }
      .sbb-wa-msg-text {
        font-size: 12.5px;
        color: #111111;
        line-height: 1.5;
        margin-bottom: 6px;
      }
      .sbb-wa-msg-text b { color: #075E54; }
      .sbb-wa-highlight {
        display: inline-block;
        background: rgba(37, 211, 102, 0.12);
        border-radius: 4px;
        padding: 1px 5px;
        font-weight: 700;
        color: #075E54;
      }
      .sbb-wa-product-preview {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 8px;
        background: #ffffff;
      }
      .sbb-wa-bubble-cta {
        border-top: 1px solid #e8e8e8;
        margin: 0 -12px -6px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        color: #128C7E;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .sbb-wa-timestamp {
        font-size: 10px;
        color: #999999;
        text-align: right;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 3px;
      }
      .sbb-wa-tick { color: #53bdeb; font-size: 12px; }
      .sbb-wa-typing {
        background: #ffffff;
        border-radius: 8px;
        padding: 8px 12px;
        align-self: flex-start;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .sbb-wa-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #999999;
        animation: sbbWaTyping 1.2s infinite;
      }
      .sbb-wa-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .sbb-wa-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes sbbWaTyping {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }
      .sbb-wa-input-bar {
        background: #075E54;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .sbb-wa-input-field {
        flex: 1;
        background: rgba(255, 255, 255, 0.12);
        border: none;
        border-radius: 20px;
        padding: 7px 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        outline: none;
      }
      .sbb-wa-send {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #25D366;
        border: none;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        cursor: pointer;
        flex-shrink: 0;
      }
    `}</style>

    <div className="sbb-wa-main">
      {/* ── LEFT: FORM SIDE ── */}
      <div className="sbb-wa-form-side">
        <div className="sbb-wa-eyebrow">Step 2 of 4</div>
        <div className="sbb-wa-title">Get alerts on WhatsApp</div>
        <div className="sbb-wa-sub">
          We'll message you directly when shoppers try on your products — see exactly what the messages look like on the right.
        </div>

        {/* Section: Contact Details */}
        <div className="sbb-wa-divider">
          <div className="sbb-wa-divider-line"></div>
          <div className="sbb-wa-divider-label">Your contact details</div>
          <div className="sbb-wa-divider-line"></div>
        </div>

        {/* Phone Number Field */}
        <div className="sbb-wa-field">
          <div className="sbb-wa-field-label">
            Phone Number <span className="req">*</span>
          </div>
          <div className="sbb-wa-phone-row">
            <select
              className="sbb-wa-phone-prefix"
              value={phonePrefix}
              onChange={(e) => setPhonePrefix(e.target.value)}
            >
              <option value="+91">+91</option>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+971">+971</option>
              <option value="+65">+65</option>
            </select>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              className="sbb-wa-field-input"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhoneNumber(val);
                if (sameAsPhone) {
                  setWhatsappNumber(val);
                }
              }}
              placeholder="98765 43210"
            />
          </div>
          <div className="sbb-wa-field-hint">This is the number we'll use for WhatsApp alerts</div>
        </div>

        {/* Same number toggle */}
        <div
          className={`sbb-wa-same-number ${sameAsPhone ? "checked" : ""}`}
          onClick={() => {
            const nextVal = !sameAsPhone;
            setSameAsPhone(nextVal);
            if (nextVal) {
              setWhatsappNumber(phoneNumber);
            }
          }}
        >
          <div className="sbb-wa-checkbox">{sameAsPhone ? "✓" : ""}</div>
          <div>
            <div className="sbb-wa-sn-label">WhatsApp number is the same as phone number</div>
            <div className="sbb-wa-sn-sub">Uncheck if your WhatsApp is on a different number</div>
          </div>
        </div>

        {/* WhatsApp number field (shown when sameAsPhone is unchecked) */}
        {!sameAsPhone && (
          <div className="sbb-wa-field">
            <div className="sbb-wa-field-label">
              WhatsApp Number <span className="req">*</span>
            </div>
            <div className="sbb-wa-phone-row">
              <select className="sbb-wa-phone-prefix" value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)}>
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
              </select>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                className="sbb-wa-field-input"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
              />
            </div>
          </div>
        )}

        {/* Section: What you'll receive */}
        <div className="sbb-wa-divider" style={{ marginTop: "4px" }}>
          <div className="sbb-wa-divider-line"></div>
          <div className="sbb-wa-divider-label">What you'll receive</div>
          <div className="sbb-wa-divider-line"></div>
        </div>

        {/* Alert type triggers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          <div
            className={`sbb-wa-alert-card ${previewTab === "first" ? "active" : ""}`}
            onClick={() => setPreviewTab("first")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <span style={{ fontSize: "16px" }}>🎉</span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>First try-on alert</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>When a shopper generates their first try-on</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#008060", fontWeight: 700 }}>Preview →</span>
              <div style={{ width: "28px", height: "16px", borderRadius: "100px", background: "#008060", position: "relative" }}>
                <div style={{ position: "absolute", top: "2px", left: "14px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff" }}></div>
              </div>
            </div>
          </div>

          <div
            className={`sbb-wa-alert-card ${previewTab === "credits" ? "active" : ""}`}
            onClick={() => setPreviewTab("credits")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <span style={{ fontSize: "16px" }}>⚡</span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>80% credits used</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Before your button goes dark this month</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#008060", fontWeight: 700 }}>Preview →</span>
              <div style={{ width: "28px", height: "16px", borderRadius: "100px", background: "#008060", position: "relative" }}>
                <div style={{ position: "absolute", top: "2px", left: "14px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="sbb-wa-privacy-note">
          <span style={{ fontSize: "13px", flexShrink: 0 }}>🔒</span>
          Only try-on alerts and important account notifications. No marketing, ever. Unsubscribe anytime from Settings.
        </div>

        {/* Footer Save Button */}
        <div className="sbb-wa-form-foot">
          <button
            className="sbb-wa-btn-save"
            onClick={handleSavePhone}
            disabled={
              isSubmitting ||
              !/^\d{10}$/.test(phoneNumber) ||
              !/^\d{10}$/.test(whatsappNumber)
            }
          >
            <span>💬</span> {isSubmitting ? "Saving..." : "Save & Continue →"}
          </button>
        </div>
      </div>

      {/* ── RIGHT: WHATSAPP PREVIEW ── */}
      <div className="sbb-wa-preview-side">
        <div className="sbb-wa-preview-label">Live preview — exactly how it looks on your phone</div>

        {/* WA Header */}
        <div className="sbb-wa-header">
          <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>‹</div>
          <div className="sbb-wa-avatar">🤖</div>
          <div className="sbb-wa-info">
            <div className="sbb-wa-name">See Before Buy</div>
            <div className="sbb-wa-status">Business Account · Usually replies instantly</div>
          </div>
          <div style={{ display: "flex", gap: "12px", color: "rgba(255,255,255,0.7)" }}>
            <span>📞</span>
            <span>⋮</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="sbb-wa-tabs">
          <div
            className={`sbb-wa-tab ${previewTab === "first" ? "on" : ""}`}
            onClick={() => setPreviewTab("first")}
          >
            🎉 First try-on
          </div>
          <div
            className={`sbb-wa-tab ${previewTab === "credits" ? "on" : ""}`}
            onClick={() => setPreviewTab("credits")}
          >
            ⚡ Credits alert
          </div>
        </div>

        {/* WA Body */}
        <div className="sbb-wa-body">
          <div className="sbb-wa-date-badge">Today</div>

          {/* MSG SET 1: First Try-On */}
          {previewTab === "first" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="sbb-wa-bubble">
                <div className="sbb-wa-app-row">
                  <div className="sbb-wa-app-icon">SB</div>
                  <div>
                    <div className="sbb-wa-app-name">See Before Buy</div>
                    <div className="sbb-wa-app-sub">Your Store</div>
                  </div>
                </div>

                <div className="sbb-wa-alert-badge">🎉 First Try-On!</div>

                <div className="sbb-wa-msg-text">
                  Someone just tried on a product on your store for the first time!<br /><br />
                  <b>Product:</b> <span className="sbb-wa-highlight">White Ringer Tee</span><br />
                  <b>Time:</b> Just now<br />
                  <b>Credits left:</b> 49 of 50
                </div>

                <div className="sbb-wa-product-preview">
                  <div style={{ background: "linear-gradient(135deg,#f8fafc,#ecfdf5)", height: "54px", display: "flex", alignItems: "center", gap: "10px", padding: "0 10px" }}>
                    <span style={{ fontSize: "26px" }}>👕</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>White Ringer Tee</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>PoolHouseKora · ₹699</div>
                    </div>
                  </div>
                </div>

                <div className="sbb-wa-bubble-cta">🔗 View on dashboard</div>
                <div className="sbb-wa-timestamp">12:34 PM <span className="sbb-wa-tick">✓✓</span></div>
              </div>

              <div className="sbb-wa-typing">
                <div className="sbb-wa-typing-dot"></div>
                <div className="sbb-wa-typing-dot"></div>
                <div className="sbb-wa-typing-dot"></div>
              </div>
            </div>
          )}

          {/* MSG SET 2: Credits Alert */}
          {previewTab === "credits" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="sbb-wa-bubble">
                <div className="sbb-wa-app-row">
                  <div className="sbb-wa-app-icon">SB</div>
                  <div>
                    <div className="sbb-wa-app-name">See Before Buy</div>
                    <div className="sbb-wa-app-sub">Your Store</div>
                  </div>
                </div>

                <div
                  className="sbb-wa-alert-badge"
                  style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)", color: "#b45309" }}
                >
                  ⚡ Credits Running Low
                </div>

                <div className="sbb-wa-msg-text">
                  You've used <span className="sbb-wa-highlight" style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}>40 of 50 try-ons</span> this month.<br /><br />
                  Your "Try The Look" button will go dark when credits run out. Upgrade now to keep it live all month.<br /><br />
                  <b>Plan:</b> Starter (50 try-ons/month)<br />
                  <b>Used:</b> 40 · <b>Remaining:</b> 10
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #e8e8e8", margin: "0 -12px -6px" }}>
                  <div style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 700, color: "#64748b", borderRight: "1px solid #e8e8e8", textAlign: "center", cursor: "pointer" }}>Later</div>
                  <div style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 700, color: "#128C7E", textAlign: "center", cursor: "pointer" }}>⬆ Upgrade now</div>
                </div>

                <div className="sbb-wa-timestamp" style={{ marginTop: "8px" }}>Yesterday, 11:15 AM <span className="sbb-wa-tick">✓✓</span></div>
              </div>

              <div className="sbb-wa-typing">
                <div className="sbb-wa-typing-dot"></div>
                <div className="sbb-wa-typing-dot"></div>
                <div className="sbb-wa-typing-dot"></div>
              </div>
            </div>
          )}
        </div>

        {/* WA Input bar */}
        <div className="sbb-wa-input-bar">
          <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>☺</span>
          <input className="sbb-wa-input-field" placeholder="Message" readOnly />
          <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>📎</span>
          <button className="sbb-wa-send">➤</button>
        </div>
      </div>
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
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "20px",
                        alignItems: "stretch",
                      }}
                    >
                      {/* Product card */}
                      <div>
                        <div
                          className={styles.tgHead}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            marginBottom: "12px",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#1F2937",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          <span
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "8px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#E6F7F2",
                              color: "#008060",
                              fontSize: "12px",
                              fontWeight: 800,
                            }}
                          >
                            1
                          </span>
                          Your product
                        </div>
                        {demoProduct ? (
                          <div
                            className={`${styles.prodThumb} ${styles.prodThumbOn}`}
                            style={{
                              cursor: "default",
                              height: "286px",
                              padding: "14px",
                              borderRadius: "18px",
                              border: "1px solid #D5EDE7",
                              background: "linear-gradient(145deg, #FFFFFF 0%, #F4FBF9 100%)",
                              boxShadow: "0 10px 26px rgba(0, 128, 96, 0.10)",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: "14px",
                                left: "14px",
                                zIndex: 1,
                                padding: "5px 8px",
                                borderRadius: "999px",
                                background: "#E6F7F2",
                                color: "#007A5A",
                                fontSize: "10px",
                                fontWeight: 800,
                              }}
                            >
                              SELECTED
                            </div>
                            {demoProduct.image ? (
                              <img
                                src={demoProduct.image}
                                alt={demoProduct.imageAlt}
                                style={{
                                  width: "100%",
                                  height: "196px",
                                  objectFit: "contain",
                                  borderRadius: "12px",
                                }}
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
                                fontSize: "15px",
                                color: "#008060",
                                fontWeight: 800,
                                marginTop: "6px",
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
                              fontSize: "13px",
                              color: "#9CA3AF",
                              height: "286px",
                              borderRadius: "18px",
                              border: "1px dashed #D1D5DB",
                              background: "#FAFAFA",
                            }}
                          >
                            No products found
                          </div>
                        )}
                      </div>

                      {/* Upload box */}
                      <div>
                        <div
                          className={styles.tgHead}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            marginBottom: "12px",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#1F2937",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          <span
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "8px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#EEF2FF",
                              color: "#4F46E5",
                              fontSize: "12px",
                              fontWeight: 800,
                            }}
                          >
                            2
                          </span>
                          Upload model photo
                        </div>
                        <div
                          className={`${styles.uploadBox} ${userPhoto ? styles.uploadBoxHas : ""}`}
                          style={{
                            height: "286px",
                            minHeight: "286px",
                            borderRadius: "18px",
                            border: "1px dashed #C7D2FE",
                            background: "linear-gradient(145deg, #FFFFFF 0%, #F8F9FF 100%)",
                            boxShadow: "0 10px 26px rgba(79, 70, 229, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
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
                                style={{ borderRadius: "12px" }}
                            />
                          ) : (
                            <div>
                              <div
                                style={{
                                  width: "58px",
                                  height: "58px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: "0 auto 15px",
                                  borderRadius: "17px",
                                  background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
                                  fontSize: "27px",
                                }}
                              >
                                📸
                              </div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#4B5563",
                                }}
                              >
                                Click to upload
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#9CA3AF",
                                  marginTop: "7px",
                                }}
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
                      style={{
                        width: "100%",
                        marginTop: "18px",
                        minHeight: "46px",
                        borderRadius: "11px",
                        fontWeight: 800,
                        boxShadow: "0 8px 18px rgba(0, 128, 96, 0.18)",
                      }}
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