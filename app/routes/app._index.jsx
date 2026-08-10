import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import styles from "./app._index/dashboard.module.css";

/**
 * ============================================
 * DASHBOARD - Welcome & Integration
 * ============================================
 *
 * This is the main dashboard that merchants see after installing the app.
 *
 * Flow:
 * 1. Check if merchant account exists in backend
 * 2. If not, show "Start Integration" button
 * 3. On click, create account with real email
 * 4. Open theme editor automatically
 * 5. Send welcome email
 */

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);

  // Get shop information from Shopify session
  const shopDomain = session.shop;

  // ── Handle Shopify App Pricing return URL ────────────────────────────────
  // Shopify redirects back to /app with ?charge_id=xxx&plan_handle=xxx
  // after merchant approves a subscription on the pricing page.
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const planHandle = url.searchParams.get("plan_handle"); // e.g. "standard"

  if (chargeId && planHandle) {
    console.log(`💳 Plan activated — shop: ${shopDomain} | plan: ${planHandle} | charge: ${chargeId}`);

    // Map plan handle → credits
    const planMap = {
      standard: { plan_type: "starter", images_limit: 500 },
      growth:   { plan_type: "growth",  images_limit: 1000 },
      scale:    { plan_type: "pro",     images_limit: 10000 },
    };
    const planConfig = planMap[planHandle.toLowerCase()] || planMap.standard;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const res = await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          plan_name: planHandle,
          images_limit: planConfig.images_limit,
          charge_id: chargeId,
        }),
      });
      const data = await res.json();
      console.log(`✅ Plan activated in loader: ${shopDomain} → ${planConfig.plan_type} | response:`, data);
    } catch (err) {
      console.error("❌ Plan activation failed in loader:", err.message);
    }
  }

  // Fetch actual store owner email from Shopify GraphQL
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
      // Use contactEmail (store owner email) if available, otherwise use shop email
      shopEmail =
        data.data.shop.contactEmail || data.data.shop.email || shopEmail;
      shopName = data.data.shop.name || shopName;

      console.log("📊 Dashboard loaded for:", shopDomain);
      console.log("   Store Name:", shopName);
      console.log("   Store Email:", shopEmail);
      console.log("   Contact Email:", data.data.shop.contactEmail);
    }
  } catch (error) {
    console.error("⚠️  Could not fetch shop details from Shopify:", error);
    console.log("   Using fallback email:", shopEmail);
  }

  // Check if shop exists in backend
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    console.log(
      "🔍 Fetching shop status from:",
      `${backendUrl}/api/shop-status/${shopDomain}`,
    );
    const response = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
    const data = await response.json();

    // Fetch predicted impact in parallel
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

    console.log("📦 Shop status response:", JSON.stringify(data, null, 2));

    // Auto-sync orders if needed (> 1 hour since last sync)
    const lastSyncTime = data.shopStatus?.order_sync?.last_sync_time;
    const oneHourAgo = Date.now() - 3600000; // 1 hour in milliseconds
    const isSyncing = data.shopStatus?.order_sync?.is_syncing;

    if (data.accountExists && !isSyncing) {
      if (!lastSyncTime || new Date(lastSyncTime).getTime() < oneHourAgo) {
        console.log("🔄 Auto-syncing orders (last sync > 1 hour ago)...");

        // Trigger sync in background (don't wait for it)
        fetch(`${backendUrl}/api/sync-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_domain: shopDomain,
            session: {
              shop: session.shop,
              accessToken: session.accessToken,
            },
          }),
        }).catch((err) => console.error("Auto-sync error:", err));
      }
    }

    return {
      shop: {
        domain: shopDomain,
        email: shopEmail,
        name: shopName,
      },
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

    // Return shop info even if backend check fails
    return {
      shop: {
        domain: shopDomain,
        email: shopEmail,
        name: shopName,
      },
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
    // Create merchant account in backend
    const shopDomain = session.shop;

    // Fetch actual store owner email from Shopify GraphQL
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
        // Use contactEmail (store owner email) if available
        shopEmail =
          data.data.shop.contactEmail || data.data.shop.email || shopEmail;
        shopName = data.data.shop.name || shopName;

        console.log("🎉 Creating merchant account...");
        console.log("   Shop:", shopDomain);
        console.log("   Store Name:", shopName);
        console.log("   Store Email:", shopEmail);
        console.log("   Contact Email:", data.data.shop.contactEmail);
      }
    } catch (error) {
      console.error("⚠️  Could not fetch shop details:", error);
      console.log("   Using fallback email:", shopEmail);
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${backendUrl}/api/merchant/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          shop_email: shopEmail,
          shop_name: shopName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Account created successfully!");
        return {
          success: true,
          step: "accountCreated",
          message: "Account created successfully! Email sent to store owner.",
        };
      } else {
        console.error("❌ Failed to create account:", data.error);
        return {
          success: false,
          error: data.error || "Failed to create account",
        };
      }
    } catch (error) {
      console.error("❌ Error creating account:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  if (actionType === "savePhoneNumbers") {
    const shopDomain = formData.get("shop_domain");
    const phoneNumber = formData.get("phone_number");
    const whatsappNumber = formData.get("whatsapp_number");

    console.log("📱 Saving phone numbers...");
    console.log("   Shop:", shopDomain);

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${backendUrl}/api/merchant/save-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_domain: shopDomain, phone_number: phoneNumber, whatsapp_number: whatsappNumber }),
      });
      const data = await response.json();
      if (data.success) {
        console.log("✅ Phone numbers saved!");
        return { success: true, step: "phoneSaved" };
      }
      return { success: false, error: data.error || "Failed to save phone numbers" };
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
      } catch (error) {
        console.error("❌ Failed to parse categories payload:", error);
        categories = [];
      }
    } else if (categoryValue) {
      categories = [{ main_category: categoryValue, subcategories: [] }];
    }

    console.log("💾 Saving product categories...");
    console.log("   Shop:", shopDomain);
    console.log("   Categories:", categories);

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(
        `${backendUrl}/api/merchant/save-categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: shopDomain,
            categories,
            category: categories[0]?.main_category || categoryValue,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        console.log("✅ Category saved successfully!");
        return {
          success: true,
          step: "categoriesSaved",
          message: "Category saved!",
        };
      } else {
        console.error("❌ Failed to save category:", data.error);
        return {
          success: false,
          error: data.error || "Failed to save category",
        };
      }
    } catch (error) {
      console.error("❌ Error saving category:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  if (actionType === "updateAppStatus") {
    // Update app status to active
    const shopDomain = formData.get("shop_domain");
    const status = formData.get("status");

    console.log("🔄 Updating app status...");
    console.log("   Shop:", shopDomain);
    console.log("   Status:", status);

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(
        `${backendUrl}/api/merchant/update-app-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: shopDomain,
            status: status,
          }),
        },
      );

      // Check if response is OK
      if (!response.ok) {
        console.error(
          "❌ Backend returned error:",
          response.status,
          response.statusText,
        );
        const text = await response.text();
        console.error("   Response:", text);
        return {
          success: false,
          error: `Backend error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (data.success) {
        console.log("✅ App status updated successfully!");
        return {
          success: true,
          step: "appStatusUpdated",
          message: "App activated!",
        };
      } else {
        console.error("❌ Failed to update app status:", data.error);
        return {
          success: false,
          error: data.error || "Failed to update app status",
        };
      }
    } catch (error) {
      console.error("❌ Error updating app status:", error);
      console.error("   Error details:", error.message);
      return {
        success: false,
        error: `Cannot connect to backend: ${error.message}. Make sure backend is running on port 5000.`,
      };
    }
  }

  if (actionType === "syncOrders") {
    // Sync orders from Shopify
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    console.log("🔄 Manual sync orders triggered...");
    console.log("   Shop:", shopDomain);

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    try {
      const response = await fetch(`${backendUrl}/api/sync-orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          session: {
            shop: session.shop,
            accessToken: session.accessToken,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Orders synced successfully!");
        return {
          success: true,
          step: "ordersSynced",
          new_orders: data.new_orders,
          total_orders: data.total_orders,
          total_revenue: data.total_revenue,
          message: data.message,
        };
      } else {
        console.error("❌ Failed to sync orders:", data.error);
        return {
          success: false,
          error: data.message || "Failed to sync orders",
        };
      }
    } catch (error) {
      console.error("❌ Error syncing orders:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  return { success: false };
};

export default function Index() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const shopify = useAppBridge();
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showActivation, setShowActivation] = useState(false);
  const [showPhoneStep, setShowPhoneStep] = useState(false);   // NEW
  const [phoneNumber, setPhoneNumber] = useState('');           // NEW
  const [whatsappNumber, setWhatsappNumber] = useState('');     // NEW
  const [selectedDays, setSelectedDays] = useState(30); // date range: 7, 30, 90
  const [rangeMetrics, setRangeMetrics] = useState(null); // metrics for selected range
  const [isLoadingRange, setIsLoadingRange] = useState(false);

  const isCreatingAccount = fetcher.state === "submitting";
  const isSavingCategories =
    fetcher.state === "submitting" &&
    fetcher.formData?.get("actionType") === "saveCategories";
  const isSavingPhone =
    fetcher.state === "submitting" &&
    fetcher.formData?.get("actionType") === "savePhoneNumbers";
  const isSyncingOrders =
    fetcher.state === "submitting" &&
    fetcher.formData?.get("actionType") === "syncOrders";

  // Get app status from backend
  const appStatus = loaderData.shopStatus?.app_status || "disabled";
  const isActive = appStatus === "active";

  // Check if category has been selected
  const hasCategory = Boolean(
    loaderData.shopStatus?.product_category ||
    loaderData.shopStatus?.product_categories?.length,
  );

  // Get last sync info
  const lastSyncTime = loaderData.shopStatus?.order_sync?.last_sync_time;
  const totalOrdersSynced =
    loaderData.shopStatus?.order_sync?.total_orders_synced || 0;

  // Calculate time since last sync
  const getTimeSinceSync = () => {
    if (!lastSyncTime) return "Never";

    const now = Date.now();
    const syncTime = new Date(lastSyncTime).getTime();
    const diffMs = now - syncTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  // Function to fetch predicted impact for a given day range
  const fetchRangeMetrics = async (days) => {
    const backendUrl = "https://seebeforebuy.in";
    const shopDomain = loaderData.shop.domain;
    setIsLoadingRange(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/shop-status/${shopDomain}/predicted-impact?days=${days}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRangeMetrics(data.predicted || null);
      }
    } catch (e) {
      console.error("Range metrics fetch error:", e);
    } finally {
      setIsLoadingRange(false);
    }
  };

  // Handle date range selection
  const handleDateRange = (days) => {
    setSelectedDays(days);
    fetchRangeMetrics(days);
  };

  // Load range metrics on mount when app is active
  useEffect(() => {
    if (
      loaderData.accountExists &&
      loaderData.shopStatus?.app_status === "active"
    ) {
      fetchRangeMetrics(selectedDays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaderData.accountExists, loaderData.shopStatus?.app_status]);

  // Show success message when account is created
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.step === "accountCreated") {
      shopify.toast.show("Account created successfully!");
      setShowPhoneStep(true);   // Show phone step first, not category
    } else if (fetcher.data?.success && fetcher.data?.step === "phoneSaved") {
      shopify.toast.show("Contact details saved!");
      setShowPhoneStep(false);
      setShowCategorySelection(true);
    } else if (
      fetcher.data?.success &&
      fetcher.data?.step === "categoriesSaved"
    ) {
      shopify.toast.show("Categories saved!");
      setShowCategorySelection(false);
      setShowActivation(true);
    } else if (
      fetcher.data?.success &&
      fetcher.data?.step === "appStatusUpdated"
    ) {
      shopify.toast.show("App activated successfully!");
      console.log("✅ Status updated, revalidating data...");
      // Use setTimeout to ensure toast is shown before revalidating
      setTimeout(() => {
        // Revalidate data without page reload
        revalidator.revalidate();
      }, 1000);
    } else if (fetcher.data?.success && fetcher.data?.step === "ordersSynced") {
      const newOrders = fetcher.data.new_orders || 0;
      const totalRevenue = fetcher.data.total_revenue || 0;

      if (newOrders > 0) {
        shopify.toast.show(
          `✅ Synced ${newOrders} new orders! Revenue: $${totalRevenue.toFixed(2)}`,
        );
      } else {
        shopify.toast.show("✅ No new orders found");
      }

      // Revalidate data to show updated metrics
      setTimeout(() => {
        revalidator.revalidate();
      }, 1500);
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`, { isError: true });
    }
  }, [fetcher.data, shopify, revalidator]);

  // Function to open theme editor on product page
  const openThemeEditor = () => {
    // Open product template in theme editor
    // Merchant will manually add the app block from the left sidebar
    const params = new URLSearchParams({
      template: "product",
      context: "apps",
    });

    const themeEditorUrl = `https://${loaderData.shop.domain}/admin/themes/current/editor?${params.toString()}`;

    console.log("🎨 Opening theme editor:", themeEditorUrl);
    window.open(themeEditorUrl);
  };

  // Function to activate app (opens theme editor)
  const activateApp = () => {
    shopify.toast.show("Opening theme editor...");
    openThemeEditor();
  };

  // Function to confirm activation after merchant adds the block
  const confirmActivation = () => {
    fetcher.submit(
      {
        actionType: "updateAppStatus",
        shop_domain: loaderData.shop.domain,
        status: "active",
      },
      { method: "POST" },
    );
  };

  // Function to start integration
  const startIntegration = () => {
    fetcher.submit({ actionType: "createAccount" }, { method: "POST" });
  };

  // Save phone + whatsapp numbers
  const savePhoneNumbers = () => {
    const phone = phoneNumber.trim();
    const whatsapp = whatsappNumber.trim();
    if (!phone || !whatsapp) {
      shopify.toast.show("Please enter both phone and WhatsApp numbers", { isError: true });
      return;
    }
    fetcher.submit(
      {
        actionType: "savePhoneNumbers",
        shop_domain: loaderData.shop.domain,
        phone_number: phone,
        whatsapp_number: whatsapp,
      },
      { method: "POST" },
    );
  };

  const toggleCategory = (mainCategory, allSubcategories = []) => {
    setSelectedCategories((current) => {
      const exists = current.find(
        (entry) => entry.main_category === mainCategory,
      );
      if (exists) {
        // Deselect — remove it
        return current.filter((entry) => entry.main_category !== mainCategory);
      }
      // Select — auto-fill ALL subcategory keys
      const subKeys = allSubcategories.map((s) => s[0]);
      return [...current, { main_category: mainCategory, subcategories: subKeys }];
    });
  };

  const toggleSubcategory = (mainCategory, subcategory) => {
    setSelectedCategories((current) => {
      const existing = current.find(
        (entry) => entry.main_category === mainCategory,
      );
      if (!existing) {
        return [
          ...current,
          { main_category: mainCategory, subcategories: [subcategory] },
        ];
      }

      const hasSubcategory = existing.subcategories.includes(subcategory);
      return current.map((entry) => {
        if (entry.main_category !== mainCategory) return entry;
        return {
          ...entry,
          subcategories: hasSubcategory
            ? entry.subcategories.filter((item) => item !== subcategory)
            : [...entry.subcategories, subcategory],
        };
      });
    });
  };

  const saveCategory = () => {
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

  // Function to sync orders manually
  const handleSyncOrders = () => {
    fetcher.submit({ actionType: "syncOrders" }, { method: "POST" });
  };

  return (
    <s-page heading="See Before Buy AI">
      {/* Welcome Hero Section - First Time Only */}
      {!loaderData.accountExists && (
        <div className={styles.welcomeHero}>
          <h1 className={styles.heroTitle}>
            Let shoppers try your products on themselves
          </h1>
          <p className={styles.heroSubtitle}>
            Increase conversions & reduce returns with AI-powered virtual
            try-on.
          </p>
          <button
            className={styles.tealButton}
            onClick={startIntegration}
            disabled={isCreatingAccount}
          >
            {isCreatingAccount ? "Setting up..." : "Get Started (2 min setup)"}
          </button>
        </div>
      )}

      {/* Phone Number Step - After Account Created, Before Category */}
      {showPhoneStep && (
        <div className={styles.categorySection}>
          <h2 className={styles.categoryTitle}> Contact Details</h2>
          <p className={styles.categorySubtitle}>
            Please enter your contact numbers so we can reach you for support and updates.
          </p>

          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            {/* Phone Number */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                 Phone Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 12345 67890"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                Your primary contact number
              </p>
            </div>

            {/* WhatsApp Number */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                 WhatsApp Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 12345 67890"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                Can be the same as phone number
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                className={styles.tealButton}
                onClick={savePhoneNumbers}
                disabled={isSavingPhone || !phoneNumber.trim() || !whatsappNumber.trim()}
              >
                {isSavingPhone ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection - After Phone Step OR if no category selected */}
      {(showCategorySelection ||
        (loaderData.accountExists && !hasCategory && !isActive)) && (
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "12px",
            }}
          >
            How to select the categories
          </h3>
          <video
            src="https://cdn.shopify.com/videos/c/o/v/b873ca4b7cee4fef84dae899af3d05c9.mp4"
            controls
            style={{ maxWidth: "600px", width: "100%", borderRadius: "8px" }}
          />
        </div>
      )}

      {(showCategorySelection ||
        (loaderData.accountExists && !hasCategory && !isActive)) && (
        <div className={styles.categorySection}>
          <h2 className={styles.categoryTitle}>
            Select Your Product Categories
          </h2>
          <p className={styles.categorySubtitle}>
            Select the Multiple Categories which is right fit for you business
          </p>
          <div className={styles.categoryList}>
            {[
              {
                value: "indo_western",
                label: " Indo Western",
                examples:
                  "Jacket kurti, fusion dress, dhoti pant, crop top lehenga, draped dress",
                subcategories: [
                  ["jacket_kurti", "Jacket Kurti / Cape Kurti"],
                  ["indo_western_gown", "Indo Western Gown"],
                  ["fusion_dress", "Fusion Dress (Block Print, Ikat, Ajrakh)"],
                  ["dhoti_pant", "Dhoti Pant"],
                  ["crop_top_lehenga", "Crop Top with Lehenga"],
                  ["jacket_lehenga", "Jacket Lehenga / Cape Lehenga"],
                  ["kurti_jeans", "Kurti with Jeans"],
                  ["draped_dress", "Draped / Saree-Style Dress"],
                ],
              },
              {
                value: "party_wear",
                label: " Party Wear",
                examples:
                  "Cocktail dress, evening gown, party saree, designer lehenga",
                subcategories: [
                  ["cocktail_dress", "Cocktail Dress"],
                  ["evening_gown", "Evening Gown / Ball Gown"],
                  ["party_saree", "Party Saree (Shimmer / Net / Organza)"],
                  ["designer_lehenga", "Designer / Bridal Lehenga"],
                ],
              },
              {
                value: "winter_wear",
                label: " Winter Wear",
                examples:
                  "Puffer jacket, hoodie, sweater, leather jacket, parka, poncho",
                subcategories: [
                  ["puffer_jacket", "Puffer / Quilted Jacket"],
                  ["hoodie", "Hoodie"],
                  ["sweater", "Sweater / Knit Jumper"],
                  ["sweatshirt", "Sweatshirt / Crew Neck"],
                  ["leather_jacket", "Leather / Biker Jacket"],
                  ["denim_jacket", "Denim Jacket"],
                  ["parka", "Parka Jacket"],
                  ["poncho", "Poncho"],
                  ["general_jacket", "General / Casual Jacket"],
                ],
              },
              {
                value: "casual",
                label: " Casual Wear",
                examples: "T-shirts, shirts, kurtis, sarees",
                subcategories: [
                  ["tshirt", "T-Shirt / Polo / Graphic Tee"],
                  ["shirt", "Shirt / Blouse / Button-Up"],
                  ["kurti", "Kurti / Kurta / Salwar Kameez"],
                  ["saree", "Saree (Cotton / Silk / Daily Wear)"],
                ],
              },
              {
                value: "watch",
                label: " Watches",
                examples: "Wristwatches, smartwatches, luxury timepieces",
                subcategories: [],
              },
              {
                value: "jewellery",
                label: " Jewellery",
                examples: "Rings, necklaces, earrings, bangles",
                subcategories: [
                  ["ring", "Ring"],
                  ["necklace", "Necklace / Pendant / Chain"],
                  ["earring", "Earrings (Studs, Jhumka, Drops)"],
                ],
              },
              {
                value: "activewear",
                label: " Activewear & Gym Wear",
                examples:
                  "Compression wear, sports bra, joggers, biker shorts, tracksuit",
                subcategories: [
                  ["compression_wear", "Compression Wear / Tights"],
                  ["tank_top", "Athletic Tank Top"],
                  ["half_sleeve_tshirt", "Athletic T-Shirt"],
                  ["regular_gym_lower", "Track Pant / Gym Lower"],
                  ["baggy_lower", "Baggy Lower / Parachute Pant"],
                  ["sports_bra", "Sports Bra"],
                  ["jogger_pants", "Jogger Pants"],
                  ["gym_shorts", "Gym Shorts / Athletic Shorts"],
                  ["cycling_shorts", "Cycling Shorts / Biker Shorts"],
                  ["tracksuit_set", "Tracksuit / Co-ord Set"],
                  ["zip_up_gym_jacket", "Zip-Up Gym Jacket / Windcheater"],
                  ["sports_leggings", "Sports Leggings (Mid-Compression)"],
                ],
              },
              {
                value: "headwear_caps",
                label: " Headwear & Caps",
                examples:
                  "Baseball cap, snapback, trucker hat, bucket hat, beanie",
                subcategories: [
                  ["baseball_dad_cap", "Baseball Cap / Dad Cap"],
                  ["snapback_cap", "Snapback Cap (Flat Brim)"],
                  ["trucker_cap", "Trucker Cap (Mesh Back)"],
                  ["bucket_hat", "Bucket Hat"],
                  ["beanie_cap", "Beanie / Skull Cap"],
                  ["sports_cap", "Sports / Performance Cap"],
                ],
              },

            ].map((option) => {
              const selectedEntry = selectedCategories.find(
                (entry) => entry.main_category === option.value,
              );
              const isSelected = Boolean(selectedEntry);
              const subcategories = selectedEntry?.subcategories || [];

              return (
                <div
                  key={option.value}
                  className={`${styles.categoryItem} ${isSelected ? styles.selected : ""}`}
                >
                  <div className={styles.categoryCheckbox}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(option.value, option.subcategories)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className={styles.categoryContent}
                      onClick={() => toggleCategory(option.value, option.subcategories)}
                    >
                      <div className={styles.categoryName}>{option.label}</div>
                      <div className={styles.categoryExamples}>
                        {option.examples}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              className={styles.tealButton}
              onClick={saveCategory}
              disabled={isSavingCategories || !selectedCategories.length}
            >
              {isSavingCategories ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* instruction guide video  */}

      {showActivation && !isActive && (
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "12px",
            }}
          >
            How to Add the Try-On Block to Your Product Pages
          </h3>
          <video
            src="https://cdn.shopify.com/videos/c/o/v/8d3ec3a22a01482ca376ea8d8b7b6b0b.mp4"
            controls
            style={{ maxWidth: "600px", width: "100%", borderRadius: "8px" }}
          />
        </div>
      )}

      {/* Activation Section - After Categories Saved */}
      {showActivation && !isActive && (
        <div className={styles.activationSection}>
          <div className={`${styles.statusBadge} ${styles.disabled}`}>
            ⚠️ Disabled
          </div>

          <h2 className={styles.activationTitle}>
            Add "Try the Look" to Your Product Pages
          </h2>
          <p className={styles.activationSubtitle}>
            Follow these steps to activate the AI virtual try-on feature:
          </p>

          <div
            style={{
              textAlign: "left",
              maxWidth: "600px",
              margin: "0 auto 32px",
              background: "#F9FAFB",
              padding: "24px",
              borderRadius: "8px",
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
              <li style={{ marginBottom: "12px" }}>
                Click "Open Theme Editor" below
              </li>
              <li style={{ marginBottom: "12px" }}>
                In the left sidebar, find "Try the Look" under Apps
              </li>
              <li style={{ marginBottom: "12px" }}>
                Drag it to your product page (below product info)
              </li>
              <li style={{ marginBottom: "12px" }}>
                Click "Save" in the theme editor
              </li>
              <li style={{ marginBottom: "0" }}>
                Come back here and click "I've Added the Block"
              </li>
            </ol>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            <button className={styles.tealButton} onClick={activateApp}>
              Open Theme Editor
            </button>
            <button className={styles.tealButton} onClick={confirmActivation}>
              I've Added the Block
            </button>
          </div>

          {/* Greyed out stats */}
          <div className={styles.statsDisabled}>
            <div
              className={styles.statsCard}
              style={{ boxShadow: "none", border: "1px solid #E5E7EB" }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "#6B7280",
                }}
              >
                Usage Statistics (Inactive)
              </h3>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Plan</div>
                  <div className={styles.statValue}>Free</div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Images Used</div>
                  <div className={styles.statValue}>0/50</div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Images Generated</div>
                  <div className={styles.statValue}>0</div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Add to Cart</div>
                  <div className={styles.statValue}>0</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show stats if account exists and app is active */}
      {loaderData.accountExists &&
        !showCategorySelection &&
        !showActivation &&
        isActive && (
          <>
            <div className={styles.statsCard}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      marginBottom: "8px",
                      color: "#111827",
                    }}
                  >
                    Dashboard
                  </h2>
                  <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                    Track your AI try-on performance
                  </p>
                </div>
                <div className={`${styles.statusBadge} ${styles.active}`}>
                  ✅ Active
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Try-On Generated</div>
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
                  <div className={styles.statLabel}>Add to Cart</div>
                  <div className={styles.statValue}>
                    {loaderData.stats?.total_add_to_cart || 0}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Add to Cart Rate</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.add_to_cart_rate || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Metrics Section - NEW */}
            <div className={styles.statsCard} style={{ marginTop: "20px" }}>
              {/* Date Range Selector */}
              <div className={styles.dateRangeBar}>
                <span className={styles.dateRangeLabel}>📅 Period:</span>
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    className={`${styles.dateRangeBtn} ${selectedDays === d ? styles.dateRangeBtnActive : ""}`}
                    onClick={() => handleDateRange(d)}
                  >
                    Last {d} Days
                  </button>
                ))}
                <span className={styles.dateRangeNote}>
                  {isLoadingRange
                    ? "Loading..."
                    : `Showing last ${selectedDays} days`}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "4px",
                      color: "#111827",
                    }}
                  >
                    Performance Metrics
                  </h3>
                  <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                    Last synced: {getTimeSinceSync()}
                  </p>
                </div>
                <button
                  className={styles.tealButton}
                  onClick={handleSyncOrders}
                  disabled={isSyncingOrders}
                  style={{ padding: "8px 16px", fontSize: "14px" }}
                >
                  {isSyncingOrders ? "⏳ Syncing..." : "🔄 Sync Orders"}
                </button>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Total Revenue</div>
                  <div
                    className={styles.statValue}
                    style={{ color: "#10B981" }}
                  >
                    ₹{loaderData.metrics?.total_revenue?.toFixed(2) || "0.00"}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Total Orders</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.total_orders || 0}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Revenue per Try-On</div>
                  <div
                    className={styles.statValue}
                    style={{ color: "#10B981" }}
                  >
                    ₹{loaderData.metrics?.revenue_per_try_on || "0.00"}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Avg Try-On / Product</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.avg_try_on_per_product || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* New Metrics Section - Row 1 */}
            <div className={styles.statsCard} style={{ marginTop: "20px" }}>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "20px",
                  color: "#111827",
                }}
              >
                Plan & Token Uses
              </h3>

              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Try-On Generated</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.try_on_generated || 0}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Plan</div>
                  <div className={styles.statValue}>
                    {/* {loaderData.shopStatus?.plan || "Free"} */}
                    {loaderData.plan_type || loaderData}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Images Used</div>
                  <div className={styles.statValue}>
                    {loaderData.usage?.used || 0}/
                    {loaderData.usage?.limit || 50}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Add to Cart Count</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.add_to_cart_count || 0}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Credit Remaining</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.credit_remaining || 0}
                  </div>
                </div>

                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Credit Used</div>
                  <div className={styles.statValue}>
                    {loaderData.metrics?.credit_used || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products Table */}
            {loaderData.top_products && loaderData.top_products.length > 0 && (
              <div className={styles.statsCard} style={{ marginTop: "20px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "20px",
                    color: "#111827",
                  }}
                >
                  🏆 Top 5 Products
                </h3>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#6B7280",
                          }}
                        >
                          Product Name
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#6B7280",
                          }}
                        >
                          Try-Ons
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#6B7280",
                          }}
                        >
                          Add to Cart Rate
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#6B7280",
                          }}
                        >
                          Add to Cart Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loaderData.top_products.map((product, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #F3F4F6" }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              fontSize: "14px",
                              color: "#111827",
                            }}
                          >
                            {product.product_name}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#329580",
                            }}
                          >
                            {product.try_on_count}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#111827",
                            }}
                          >
                            {product.conversion_rate}%
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              fontSize: "14px",
                              color: "#111827",
                            }}
                          >
                            {product.add_to_cart_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

         
          </>
        )} 

      {/* Show activation section if account exists but app is disabled */}
      {loaderData.accountExists &&
        !showCategorySelection &&
        !showActivation &&
        !isActive &&
        hasCategory && (
          <div className={styles.activationSection}>
            <div className={`${styles.statusBadge} ${styles.disabled}`}>
              ⚠️ Disabled
            </div>

            <h2 className={styles.activationTitle}>
              Add "Try the Look" to Your Product Pages
            </h2>
            <p className={styles.activationSubtitle}>
              Follow these steps to activate the AI virtual try-on feature:
            </p>

            <div
              style={{
                textAlign: "left",
                maxWidth: "600px",
                margin: "0 auto 32px",
                background: "#F9FAFB",
                padding: "24px",
                borderRadius: "8px",
              }}
            >
              <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
                <li style={{ marginBottom: "12px" }}>
                  Click "Open Theme Editor" below
                </li>
                <li style={{ marginBottom: "12px" }}>
                  In the left sidebar, find "Try the Look" under Apps
                </li>
                <li style={{ marginBottom: "12px" }}>
                  Drag it to your product page (below Buy Button)
                </li>
                <li style={{ marginBottom: "12px" }}>
                  Click "Save" in the theme editor
                </li>
                <li style={{ marginBottom: "0" }}>
                  Come back here and click "I've Added the Block"
                </li>
              </ol>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                marginBottom: "32px",
              }}
            >
              <button className={styles.tealButton} onClick={activateApp}>
                Open Theme Editor
              </button>
              <button className={styles.tealButton} onClick={confirmActivation}>
                I've Added the Block
              </button>
            </div>

            {/* Greyed out stats */}
            <div className={styles.statsDisabled}>
              <div
                className={styles.statsCard}
                style={{ boxShadow: "none", border: "1px solid #E5E7EB" }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "16px",
                    color: "#6B7280",
                  }}
                >
                  Usage Statistics (Inactive)
                </h3>

                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Plan</div>
                    <div className={styles.statValue}>
                      {loaderData.shopStatus?.plan || "Free"}
                    </div>
                  </div>

                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Images Used</div>
                    <div className={styles.statValue}>
                      {loaderData.usage?.used || 0}/
                      {loaderData.usage?.limit || 50}
                    </div>
                  </div>

                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Images Generated</div>
                    <div className={styles.statValue}>
                      {loaderData.stats?.total_images_generated || 0}
                    </div>
                  </div>

                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Add to Cart</div>
                    <div className={styles.statValue}>
                      {loaderData.stats?.total_add_to_cart || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
