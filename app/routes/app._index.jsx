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

  // Check shop status from backend
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

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

  // Category selection state
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Contact details state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Try-on Demo State
  const sampleProducts = [
    {
      name: "White Ringer Tee",
      price: "₹699",
      img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop",
    },
  ];
  const [selectedProdIdx, setSelectedProdIdx] = useState(0);
  const [userPhoto, setUserPhoto] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStageText, setGenStageText] = useState("");
  const [tryonDone, setTryonDone] = useState(false);

  // Date range metrics
  const [selectedDays, setSelectedDays] = useState(30);

  const isSubmitting = fetcher.state === "submitting";

  // Respond to action completion
  useEffect(() => {
    if (fetcher.data?.success) {
      if (fetcher.data.step === "accountCreated") {
        shopify.toast.show("Account created successfully!");
        setCurrentStep(1); // Move to Categories
      } else if (fetcher.data.step === "categoriesSaved") {
        shopify.toast.show("Categories saved!");
        setCurrentStep(2); // Move to Phone / WhatsApp
      } else if (fetcher.data.step === "phoneSaved") {
        shopify.toast.show("Contact details saved!");
        setCurrentStep(3); // Move to Try-On Demo
      } else if (fetcher.data.step === "appStatusUpdated") {
        shopify.toast.show("App activated!");
        setCurrentStep(5); // Show live confirmation and quick links
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
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserPhoto(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Run Demo Generation Simulation
  const runDemoGeneration = () => {
    if (!userPhoto) return;
    setIsGenerating(true);
    setGenProgress(10);
    setGenStageText("Reading garment details...");

    const stages = [
      { text: "Mapping body position...", p: 35 },
      { text: "Placing product on model...", p: 65 },
      { text: "Blending lighting and shadows...", p: 90 },
      { text: "Finalizing try-on preview...", p: 100 },
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < stages.length) {
        setGenStageText(stages[step].text);
        setGenProgress(stages[step].p);
        step++;
      } else {
        clearInterval(interval);
        setIsGenerating(false);
        setTryonDone(true);
      }
    }, 1000);
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
            onClick={() => setCurrentStep(0)}
          >
            <div className={styles.siDot}>{currentStep > 0 ? "✓" : "1"}</div>
            <div className={styles.siLabel}>Get Started</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 1 ? styles.stepAct : ""} ${currentStep > 1 ? styles.stepDone : ""}`}
            onClick={() => hasAccount && setCurrentStep(1)}
          >
            <div className={styles.siDot}>{currentStep > 1 ? "✓" : "2"}</div>
            <div className={styles.siLabel}>Categories</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 2 ? styles.stepAct : ""} ${currentStep > 2 ? styles.stepDone : ""}`}
            onClick={() => hasAccount && setCurrentStep(2)}
          >
            <div className={styles.siDot}>{currentStep > 2 ? "✓" : "3"}</div>
            <div className={styles.siLabel}>Contact info</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 3 ? styles.stepAct : ""} ${currentStep > 3 ? styles.stepDone : ""}`}
            onClick={() => hasAccount && setCurrentStep(3)}
          >
            <div className={styles.siDot}>{currentStep > 3 ? "✓" : "4"}</div>
            <div className={styles.siLabel}>Try it on</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 4 ? styles.stepAct : ""} ${isActive ? styles.stepDone : ""}`}
            onClick={() => hasAccount && setCurrentStep(4)}
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
                      marginTop: "8px",
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
                  className={styles.btnGhost}
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back
                </button>
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
                  Pick a product → upload a photo → generate. This is exactly
                  what your shoppers do.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.tryonGrid}>
                  {/* Left Column: Product Selection & Photo Upload */}
                  <div>
                    <div
                      style={{
                        gap: "16px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                      }}
                    >
                      <div>
                        <div className={styles.tgHead}>1. Your products</div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          {sampleProducts.map((p, idx) => (
                            <div
                              key={idx}
                              className={`${styles.prodThumb} ${selectedProdIdx === idx ? styles.prodThumbOn : ""}`}
                              onClick={() => setSelectedProdIdx(idx)}
                            >
                              <img src={p.img} alt={p.name} />
                              <div className={styles.ptName}>{p.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
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
                                Click to upload photo
                              </div>
                              <div
                                style={{ fontSize: "10px", color: "#9CA3AF" }}
                              >
                                Full body / Front facing
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      className={styles.tealButton}
                      style={{ width: "100%", marginTop: "16px" }}
                      disabled={!userPhoto || isGenerating}
                      onClick={runDemoGeneration}
                    >
                      {isGenerating
                        ? "Generating..."
                        : "✨ Generate Virtual Try-On"}
                    </button>
                  </div>

                  {/* Right Column: Interactive Generation Progress / Result */}
                  <div className={styles.resultArea}>
                    <div className={styles.tgHead}>Try-On Result</div>
                    {!isGenerating && !tryonDone && (
                      <div className={styles.raEmpty}>
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                          ✨
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#6B7280",
                          }}
                        >
                          Result will appear here
                        </div>
                        <div style={{ fontSize: "10px", color: "#9CA3AF" }}>
                          Upload photo and click Generate
                        </div>
                      </div>
                    )}

                    {isGenerating && (
                      <div className={styles.raEmpty}>
                        <div className={styles.spinner} />
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#111827",
                            marginTop: "12px",
                          }}
                        >
                          {genStageText}
                        </div>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${genProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {tryonDone && !isGenerating && (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={sampleProducts[selectedProdIdx].img}
                          alt="Result"
                          className={styles.resultImg}
                        />
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#008060",
                            marginTop: "8px",
                          }}
                        >
                          ✓ AI Try-On Generated Successfully!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div class={styles.panelFoot}>
                <button
                  className={styles.btnGhost}
                  onClick={() => setCurrentStep(2)}
                >
                  ← Back
                </button>
                <button
                  className={styles.tealButton}
                  onClick={() => setCurrentStep(4)}
                  disabled={!tryonDone}
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
                <button
                  className={styles.btnGhost}
                  onClick={() => setCurrentStep(3)}
                >
                  ← Back
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className={styles.btnGhost}
                    style={{ border: "1px solid #E5E7EB" }}
                    onClick={openThemeEditor}
                  >
                    🎨 Open Theme Editor
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
                  <br />What do you want to do next?
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
                    onClick={() => navigate("/app/settings")}
                  >
                    🎨 Customize button
                  </button>
                  <button
                    className={styles.tealButton}
                    onClick={() => setCurrentStep(6)}
                  >
                    📊 Go to dashboard
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
                      {isActive ? "✅ Active" : "⚠️ Inactive"}
                    </div>
                    <button
                      className={styles.tealButton}
                      onClick={handleSyncOrders}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Syncing..." : "🔄 Sync Orders"}
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
                      🏆 Top Products by Try-On
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
