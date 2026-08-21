// import { useEffect, useState } from "react";
// import { useFetcher, useLoaderData, useRevalidator } from "react-router";
// import { useAppBridge } from "@shopify/app-bridge-react";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";
// import styles from "./app._index/dashboard.module.css";



// export const loader = async ({ request }) => {
//   const { session, admin } = await authenticate.admin(request);

//   // Get shop information from Shopify session
//   const shopDomain = session.shop;

//   // ── Handle Shopify App Pricing return URL ────────────────────────────────
//   // Shopify redirects back to /app with ?charge_id=xxx&plan_handle=xxx
//   // after merchant approves a subscription on the pricing page.
//   const url = new URL(request.url);
//   const chargeId = url.searchParams.get("charge_id");
//   const planHandle = url.searchParams.get("plan_handle"); // e.g. "standard"

//   if (chargeId && planHandle) {
//     console.log(`💳 Plan activated — shop: ${shopDomain} | plan: ${planHandle} | charge: ${chargeId}`);

//     // Map plan handle → credits
//     const planMap = {
//       standard: { plan_type: "Starter", images_limit: 500 },
//       growth:   { plan_type: "growth",  images_limit: 1000 },
//       scale:    { plan_type: "pro",     images_limit: 10000 },
//     };
//     const planConfig = planMap[planHandle.toLowerCase()] || planMap.standard;

//     const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
//     try {
//       const res = await fetch(`${backendUrl}/api/shopify-subscription-activated`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           shop_domain: shopDomain,
//           plan_name: planHandle,
//           images_limit: planConfig.images_limit,
//           charge_id: chargeId,
//         }),
//       });
//       const data = await res.json();
//       console.log(`✅ Plan activated in loader: ${shopDomain} → ${planConfig.plan_type} | response:`, data);
//     } catch (err) {
//       console.error("❌ Plan activation failed in loader:", err.message);
//     }
//   }

//   // Fetch actual store owner email from Shopify GraphQL
//   let shopEmail = session.email || `${shopDomain.split(".")[0]}@shopify.com`;
//   let shopName = session.shop || shopDomain;

//   try {
//     const response = await admin.graphql(`
//       query {
//         shop {
//           name
//           email
//           contactEmail
//         }
//       }
//     `);

//     const data = await response.json();

//     if (data.data?.shop) {
//       // Use contactEmail (store owner email) if available, otherwise use shop email
//       shopEmail =
//         data.data.shop.contactEmail || data.data.shop.email || shopEmail;
//       shopName = data.data.shop.name || shopName;

//       console.log("📊 Dashboard loaded for:", shopDomain);
//       console.log("   Store Name:", shopName);
//       console.log("   Store Email:", shopEmail);
//       console.log("   Contact Email:", data.data.shop.contactEmail);
//     }
//   } catch (error) {
//     console.error("⚠️  Could not fetch shop details from Shopify:", error);
//     console.log("   Using fallback email:", shopEmail);
//   }

//   // Check if shop exists in backend
//   const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

//   try {
//     console.log(
//       "🔍 Fetching shop status from:",
//       `${backendUrl}/api/shop-status/${shopDomain}`,
//     );
//     const response = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
//     const data = await response.json();

//     // Fetch predicted impact in parallel
//     let predicted = null;
//     try {
//       const predRes = await fetch(
//         `${backendUrl}/api/shop-status/${shopDomain}/predicted-impact`,
//       );
//       if (predRes.ok) {
//         const predData = await predRes.json();
//         predicted = predData.predicted || null;
//       }
//     } catch {
//       /* non-critical */
//     }

//     console.log("📦 Shop status response:", JSON.stringify(data, null, 2));

//     // Auto-sync orders if needed (> 1 hour since last sync)
//     const lastSyncTime = data.shopStatus?.order_sync?.last_sync_time;
//     const oneHourAgo = Date.now() - 3600000; // 1 hour in milliseconds
//     const isSyncing = data.shopStatus?.order_sync?.is_syncing;

//     if (data.accountExists && !isSyncing) {
//       if (!lastSyncTime || new Date(lastSyncTime).getTime() < oneHourAgo) {
//         console.log("🔄 Auto-syncing orders (last sync > 1 hour ago)...");

//         // Trigger sync in background (don't wait for it)
//         fetch(`${backendUrl}/api/sync-orders`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             shop_domain: shopDomain,
//             session: {
//               shop: session.shop,
//               accessToken: session.accessToken,
//             },
//           }),
//         }).catch((err) => console.error("Auto-sync error:", err));
//       }
//     }

//     return {
//       shop: {
//         domain: shopDomain,
//         email: shopEmail,
//         name: shopName,
//       },
//       shopStatus: data.shopStatus || null,
//       usage: data.usage || null,
//       stats: data.stats || null,
//       metrics: data.metrics || null,
//       top_products: data.top_products || [],
//       predicted: predicted,
//       accountExists: data.accountExists || false,
//     };
//   } catch (error) {
//     console.error("❌ Error checking shop status:", error);

//     // Return shop info even if backend check fails
//     return {
//       shop: {
//         domain: shopDomain,
//         email: shopEmail,
//         name: shopName,
//       },
//       shopStatus: null,
//       usage: null,
//       stats: null,
//       metrics: null,
//       top_products: [],
//       predicted: null,
//       accountExists: false,
//     };
//   }
// };

// export const action = async ({ request }) => {
//   const { session, admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const actionType = formData.get("actionType");

//   if (actionType === "createAccount") {
//     // Create merchant account in backend
//     const shopDomain = session.shop;

//     // Fetch actual store owner email from Shopify GraphQL
//     let shopEmail = session.email || `${shopDomain.split(".")[0]}@shopify.com`;
//     let shopName = session.shop || shopDomain;

//     try {
//       const response = await admin.graphql(`
//         query {
//           shop {
//             name
//             email
//             contactEmail
//           }
//         }
//       `);

//       const data = await response.json();

//       if (data.data?.shop) {
//         // Use contactEmail (store owner email) if available
//         shopEmail =
//           data.data.shop.contactEmail || data.data.shop.email || shopEmail;
//         shopName = data.data.shop.name || shopName;

//         console.log("🎉 Creating merchant account...");
//         console.log("   Shop:", shopDomain);
//         console.log("   Store Name:", shopName);
//         console.log("   Store Email:", shopEmail);
//         console.log("   Contact Email:", data.data.shop.contactEmail);
//       }
//     } catch (error) {
//       console.error("⚠️  Could not fetch shop details:", error);
//       console.log("   Using fallback email:", shopEmail);
//     }

//     const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

//     try {
//       const response = await fetch(`${backendUrl}/api/merchant/onboard`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           shop_domain: shopDomain,
//           shop_email: shopEmail,
//           shop_name: shopName,
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         console.log("✅ Account created successfully!");
//         return {
//           success: true,
//           step: "accountCreated",
//           message: "Account created successfully! Email sent to store owner.",
//         };
//       } else {
//         console.error("❌ Failed to create account:", data.error);
//         return {
//           success: false,
//           error: data.error || "Failed to create account",
//         };
//       }
//     } catch (error) {
//       console.error("❌ Error creating account:", error);
//       return {
//         success: false,
//         error: error.message,
//       };
//     }
//   }

//   if (actionType === "savePhoneNumbers") {
//     const shopDomain = formData.get("shop_domain");
//     const phoneNumber = formData.get("phone_number");
//     const whatsappNumber = formData.get("whatsapp_number");

//     console.log("📱 Saving phone numbers...");
//     console.log("   Shop:", shopDomain);

//     const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

//     try {
//       const response = await fetch(`${backendUrl}/api/merchant/save-phone`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ shop_domain: shopDomain, phone_number: phoneNumber, whatsapp_number: whatsappNumber }),
//       });
//       const data = await response.json();
//       if (data.success) {
//         console.log("✅ Phone numbers saved!");
//         return { success: true, step: "phoneSaved" };
//       }
//       return { success: false, error: data.error || "Failed to save phone numbers" };
//     } catch (error) {
//       return { success: false, error: error.message };
//     }
//   }

//   if (actionType === "saveCategories") {
//     const shopDomain = formData.get("shop_domain");
//     const categoriesValue = formData.get("categories");
//     const categoryValue = formData.get("category");

//     let categories = [];
//     if (categoriesValue) {
//       try {
//         categories = JSON.parse(categoriesValue);
//       } catch (error) {
//         console.error("❌ Failed to parse categories payload:", error);
//         categories = [];
//       }
//     } else if (categoryValue) {
//       categories = [{ main_category: categoryValue, subcategories: [] }];
//     }

//     console.log("💾 Saving product categories...");
//     console.log("   Shop:", shopDomain);
//     console.log("   Categories:", categories);

//     const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

//     try {
//       const response = await fetch(
//         `${backendUrl}/api/merchant/save-categories`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             shop_domain: shopDomain,
//             categories,
//             category: categories[0]?.main_category || categoryValue,
//           }),
//         },
//       );

//       const data = await response.json();

//       if (data.success) {
//         console.log("✅ Category saved successfully!");
//         return {
//           success: true,
//           step: "categoriesSaved",
//           message: "Category saved!",
//         };
//       } else {
//         console.error("❌ Failed to save category:", data.error);
//         return {
//           success: false,
//           error: data.error || "Failed to save category",
//         };
//       }
//     } catch (error) {
//       console.error("❌ Error saving category:", error);
//       return {
//         success: false,
//         error: error.message,
//       };
//     }
//   }

//   if (actionType === "updateAppStatus") {
//     // Update app status to active
//     const shopDomain = formData.get("shop_domain");
//     const status = formData.get("status");

//     console.log("🔄 Updating app status...");
//     console.log("   Shop:", shopDomain);
//     console.log("   Status:", status);

//     const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

//     try {
//       const response = await fetch(
//         `${backendUrl}/api/merchant/update-app-status`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             shop_domain: shopDomain,
//             status: status,
//           }),
//         },
//       );

//       // Check if response is OK
//       if (!response.ok) {
//         console.error(
//           "❌ Backend returned error:",
//           response.status,
//           response.statusText,
//         );
//         const text = await response.text();
//         console.error("   Response:", text);
//         return {
//           success: false,
//           error: `Backend error: ${response.status} ${response.statusText}`,
//         };
//       }

//       const data = await response.json();

//       if (data.success) {
//         console.log("✅ App status updated successfully!");
//         return {
//           success: true,
//           step: "appStatusUpdated",
//           message: "App activated!",
//         };
//       } else {
//         console.error("❌ Failed to update app status:", data.error);
//         return {
//           success: false,
//           error: data.error || "Failed to update app status",
//         };
//       }
//     } catch (error) {
//       console.error("❌ Error updating app status:", error);
//       console.error("   Error details:", error.message);
//       return {
//         success: false,
//         error: `Cannot connect to backend: ${error.message}. Make sure backend is running on port 5000.`,
//       };
//     }
//   }

//   if (actionType === "syncOrders") {
//     // Sync orders from Shopify
//     const { session } = await authenticate.admin(request);
//     const shopDomain = session.shop;

//     console.log("🔄 Manual sync orders triggered...");
//     console.log("   Shop:", shopDomain);

//     const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

//     try {
//       const response = await fetch(`${backendUrl}/api/sync-orders`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           shop_domain: shopDomain,
//           session: {
//             shop: session.shop,
//             accessToken: session.accessToken,
//           },
//         }),
//       });

//       const data = await response.json();

//       if (data.success) {
//         console.log("✅ Orders synced successfully!");
//         return {
//           success: true,
//           step: "ordersSynced",
//           new_orders: data.new_orders,
//           total_orders: data.total_orders,
//           total_revenue: data.total_revenue,
//           message: data.message,
//         };
//       } else {
//         console.error("❌ Failed to sync orders:", data.error);
//         return {
//           success: false,
//           error: data.message || "Failed to sync orders",
//         };
//       }
//     } catch (error) {
//       console.error("❌ Error syncing orders:", error);
//       return {
//         success: false,
//         error: error.message,
//       };
//     }
//   }

//   return { success: false };
// };

// export default function Index() {
//   const loaderData = useLoaderData();
//   const fetcher = useFetcher();
//   const revalidator = useRevalidator();
//   const shopify = useAppBridge();
//   const [showCategorySelection, setShowCategorySelection] = useState(false);
//   const [selectedCategories, setSelectedCategories] = useState([]);
//   const [showActivation, setShowActivation] = useState(false);
//   const [showPhoneStep, setShowPhoneStep] = useState(false);   // NEW
//   const [phoneNumber, setPhoneNumber] = useState('');           // NEW
//   const [whatsappNumber, setWhatsappNumber] = useState('');     // NEW
//   const [selectedDays, setSelectedDays] = useState(30); // date range: 7, 30, 90
//   const [rangeMetrics, setRangeMetrics] = useState(null); // metrics for selected range
//   const [isLoadingRange, setIsLoadingRange] = useState(false);

//   const isCreatingAccount = fetcher.state === "submitting";
//   const isSavingCategories =
//     fetcher.state === "submitting" &&
//     fetcher.formData?.get("actionType") === "saveCategories";
//   const isSavingPhone =
//     fetcher.state === "submitting" &&
//     fetcher.formData?.get("actionType") === "savePhoneNumbers";
//   const isSyncingOrders =
//     fetcher.state === "submitting" &&
//     fetcher.formData?.get("actionType") === "syncOrders";

//   // Get app status from backend
//   const appStatus = loaderData.shopStatus?.app_status || "disabled";
//   const isActive = appStatus === "active";

//   // Check if category has been selected
//   const hasCategory = Boolean(
//     loaderData.shopStatus?.product_category ||
//     loaderData.shopStatus?.product_categories?.length,
//   );

//   // Get last sync info
//   const lastSyncTime = loaderData.shopStatus?.order_sync?.last_sync_time;
//   const totalOrdersSynced =
//     loaderData.shopStatus?.order_sync?.total_orders_synced || 0;

//   // Calculate time since last sync
//   const getTimeSinceSync = () => {
//     if (!lastSyncTime) return "Never";

//     const now = Date.now();
//     const syncTime = new Date(lastSyncTime).getTime();
//     const diffMs = now - syncTime;
//     const diffMins = Math.floor(diffMs / 60000);

//     if (diffMins < 1) return "Just now";
//     if (diffMins < 60)
//       return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;

//     const diffHours = Math.floor(diffMins / 60);
//     if (diffHours < 24)
//       return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

//     const diffDays = Math.floor(diffHours / 24);
//     return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
//   };

//   // Function to fetch predicted impact for a given day range
//   const fetchRangeMetrics = async (days) => {
//     const backendUrl = "https://seebeforebuy.in";
//     const shopDomain = loaderData.shop.domain;
//     setIsLoadingRange(true);
//     try {
//       const res = await fetch(
//         `${backendUrl}/api/shop-status/${shopDomain}/predicted-impact?days=${days}`,
//       );
//       if (res.ok) {
//         const data = await res.json();
//         setRangeMetrics(data.predicted || null);
//       }
//     } catch (e) {
//       console.error("Range metrics fetch error:", e);
//     } finally {
//       setIsLoadingRange(false);
//     }
//   };

//   // Handle date range selection
//   const handleDateRange = (days) => {
//     setSelectedDays(days);
//     fetchRangeMetrics(days);
//   };

//   // Load range metrics on mount when app is active
//   useEffect(() => {
//     if (
//       loaderData.accountExists &&
//       loaderData.shopStatus?.app_status === "active"
//     ) {
//       fetchRangeMetrics(selectedDays);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [loaderData.accountExists, loaderData.shopStatus?.app_status]);

//   // Show success message when account is created
//   useEffect(() => {
//     if (fetcher.data?.success && fetcher.data?.step === "accountCreated") {
//       shopify.toast.show("Account created successfully!");
//       setShowPhoneStep(true);   // Show phone step first, not category
//     } else if (fetcher.data?.success && fetcher.data?.step === "phoneSaved") {
//       shopify.toast.show("Contact details saved!");
//       setShowPhoneStep(false);
//       setShowCategorySelection(true);
//     } else if (
//       fetcher.data?.success &&
//       fetcher.data?.step === "categoriesSaved"
//     ) {
//       shopify.toast.show("Categories saved!");
//       setShowCategorySelection(false);
//       setShowActivation(true);
//     } else if (
//       fetcher.data?.success &&
//       fetcher.data?.step === "appStatusUpdated"
//     ) {
//       shopify.toast.show("App activated successfully!");
//       console.log("✅ Status updated, revalidating data...");
//       // Use setTimeout to ensure toast is shown before revalidating
//       setTimeout(() => {
//         // Revalidate data without page reload
//         revalidator.revalidate();
//       }, 1000);
//     } else if (fetcher.data?.success && fetcher.data?.step === "ordersSynced") {
//       const newOrders = fetcher.data.new_orders || 0;
//       const totalRevenue = fetcher.data.total_revenue || 0;

//       if (newOrders > 0) {
//         shopify.toast.show(
//           `✅ Synced ${newOrders} new orders! Revenue: $${totalRevenue.toFixed(2)}`,
//         );
//       } else {
//         shopify.toast.show("✅ No new orders found");
//       }

//       // Revalidate data to show updated metrics
//       setTimeout(() => {
//         revalidator.revalidate();
//       }, 1500);
//     } else if (fetcher.data?.error) {
//       shopify.toast.show(`Error: ${fetcher.data.error}`, { isError: true });
//     }
//   }, [fetcher.data, shopify, revalidator]);

//   // Function to open theme editor on product page
//   const openThemeEditor = () => {
//     // Open product template in theme editor
//     // Merchant will manually add the app block from the left sidebar
//     const params = new URLSearchParams({
//       template: "product",
//       context: "apps",
//     });

//     const themeEditorUrl = `https://${loaderData.shop.domain}/admin/themes/current/editor?${params.toString()}`;

//     console.log("🎨 Opening theme editor:", themeEditorUrl);
//     window.open(themeEditorUrl);
//   };

//   // Function to activate app (opens theme editor)
//   const activateApp = () => {
//     shopify.toast.show("Opening theme editor...");
//     openThemeEditor();
//   };

//   // Function to confirm activation after merchant adds the block
//   const confirmActivation = () => {
//     fetcher.submit(
//       {
//         actionType: "updateAppStatus",
//         shop_domain: loaderData.shop.domain,
//         status: "active",
//       },
//       { method: "POST" },
//     );
//   };

//   // Function to start integration
//   const startIntegration = () => {
//     fetcher.submit({ actionType: "createAccount" }, { method: "POST" });
//   };

//   // Save phone + whatsapp numbers
//   const savePhoneNumbers = () => {
//     const phone = phoneNumber.trim();
//     const whatsapp = whatsappNumber.trim();
//     if (!phone || !whatsapp) {
//       shopify.toast.show("Please enter both phone and WhatsApp numbers", { isError: true });
//       return;
//     }
//     fetcher.submit(
//       {
//         actionType: "savePhoneNumbers",
//         shop_domain: loaderData.shop.domain,
//         phone_number: phone,
//         whatsapp_number: whatsapp,
//       },
//       { method: "POST" },
//     );
//   };

//   const toggleCategory = (mainCategory, allSubcategories = []) => {
//     setSelectedCategories((current) => {
//       const exists = current.find(
//         (entry) => entry.main_category === mainCategory,
//       );
//       if (exists) {
//         // Deselect — remove it
//         return current.filter((entry) => entry.main_category !== mainCategory);
//       }
//       // Select — auto-fill ALL subcategory keys
//       const subKeys = allSubcategories.map((s) => s[0]);
//       return [...current, { main_category: mainCategory, subcategories: subKeys }];
//     });
//   };

//   const toggleSubcategory = (mainCategory, subcategory) => {
//     setSelectedCategories((current) => {
//       const existing = current.find(
//         (entry) => entry.main_category === mainCategory,
//       );
//       if (!existing) {
//         return [
//           ...current,
//           { main_category: mainCategory, subcategories: [subcategory] },
//         ];
//       }

//       const hasSubcategory = existing.subcategories.includes(subcategory);
//       return current.map((entry) => {
//         if (entry.main_category !== mainCategory) return entry;
//         return {
//           ...entry,
//           subcategories: hasSubcategory
//             ? entry.subcategories.filter((item) => item !== subcategory)
//             : [...entry.subcategories, subcategory],
//         };
//       });
//     });
//   };

//   const saveCategory = () => {
//     if (!selectedCategories.length) {
//       shopify.toast.show("Please select at least one category", {
//         isError: true,
//       });
//       return;
//     }

//     fetcher.submit(
//       {
//         actionType: "saveCategories",
//         categories: JSON.stringify(selectedCategories),
//         shop_domain: loaderData.shop.domain,
//       },
//       { method: "POST" },
//     );
//   };

//   // Function to sync orders manually
//   const handleSyncOrders = () => {
//     fetcher.submit({ actionType: "syncOrders" }, { method: "POST" });
//   };

//   return (
//     <s-page heading="See Before Buy AI">
//       {/* Welcome Hero Section - First Time Only */}
//       {!loaderData.accountExists && (
//         <div className={styles.welcomeHero}>
//           <h1 className={styles.heroTitle}>
//             Let shoppers try your products on themselves
//           </h1>
//           <p className={styles.heroSubtitle}>
//             Increase conversions & reduce returns with AI-powered virtual
//             try-on.
//           </p>
//           <button
//             className={styles.tealButton}
//             onClick={startIntegration}
//             disabled={isCreatingAccount}
//           >
//             {isCreatingAccount ? "Setting up..." : "Get Started (2 min setup)"}
//           </button>
//         </div>
//       )}

      

//       {/* Phone Number Step - After Account Created, Before Category */}
//       {showPhoneStep && (
//         <div className={styles.categorySection}>
//           <h2 className={styles.categoryTitle}> Contact Details</h2>
//           <p className={styles.categorySubtitle}>
//             Please enter your contact numbers so we can reach you for support and updates.
//           </p>

//           <div style={{ maxWidth: '480px', margin: '0 auto' }}>
//             {/* Phone Number */}
//             <div style={{ marginBottom: '20px' }}>
//               <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
//                  Phone Number <span style={{ color: '#EF4444' }}>*</span>
//               </label>
//               <input
//                 type="tel"
//                 value={phoneNumber}
//                 onChange={(e) => setPhoneNumber(e.target.value)}
//                 placeholder="+91 12345 67890"
//                 style={{
//                   width: '100%',
//                   padding: '12px 16px',
//                   fontSize: '15px',
//                   border: '2px solid #E5E7EB',
//                   borderRadius: '8px',
//                   outline: 'none',
//                   boxSizing: 'border-box',
//                 }}
//               />
//               <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
//                 Your primary contact number
//               </p>
//             </div>

//             {/* WhatsApp Number */}
//             <div style={{ marginBottom: '32px' }}>
//               <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
//                  WhatsApp Number <span style={{ color: '#EF4444' }}>*</span>
//               </label>
//               <input
//                 type="tel"
//                 value={whatsappNumber}
//                 onChange={(e) => setWhatsappNumber(e.target.value)}
//                 placeholder="+91 12345 67890"
//                 style={{
//                   width: '100%',
//                   padding: '12px 16px',
//                   fontSize: '15px',
//                   border: '2px solid #E5E7EB',
//                   borderRadius: '8px',
//                   outline: 'none',
//                   boxSizing: 'border-box',
//                 }}
//               />
//               <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
//                 Can be the same as phone number
//               </p>
//             </div>

//             <div style={{ textAlign: 'center' }}>
//               <button
//                 className={styles.tealButton}
//                 onClick={savePhoneNumbers}
//                 disabled={isSavingPhone || !phoneNumber.trim() || !whatsappNumber.trim()}
//               >
//                 {isSavingPhone ? 'Saving...' : 'Continue →'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Category Selection - After Phone Step OR if no category selected */}
//       {(showCategorySelection ||
//         (!showPhoneStep && loaderData.accountExists && !hasCategory && !isActive)) && (
//         <div style={{ textAlign: "center", marginTop: "32px" }}>
//           <h3
//             style={{
//               fontSize: "18px",
//               fontWeight: "600",
//               marginBottom: "12px",
//             }}
//           >
//             How to select the categories
//           </h3>
//           <video
//             src="https://cdn.shopify.com/videos/c/o/v/b873ca4b7cee4fef84dae899af3d05c9.mp4"
//             controls
//             style={{ maxWidth: "600px", width: "100%", borderRadius: "8px" }}
//           />
//         </div>
//       )}

//       {(showCategorySelection ||
//         (!showPhoneStep && loaderData.accountExists && !hasCategory && !isActive)) && (
//         <div className={styles.categorySection}>
//           <h2 className={styles.categoryTitle}>
//             Select Your Product Categories
//           </h2>
//           <p className={styles.categorySubtitle}>
//             Select the Multiple Categories which is right fit for you business
//           </p>
//           <div className={styles.categoryList}>
//             {[
//               {
//                 value: "indo_western",
//                 label: " Indo Western",
//                 examples:
//                   "Jacket kurti, fusion dress, dhoti pant, crop top lehenga, draped dress",
//                 subcategories: [
//                   ["jacket_kurti", "Jacket Kurti / Cape Kurti"],
//                   ["indo_western_gown", "Indo Western Gown"],
//                   ["fusion_dress", "Fusion Dress (Block Print, Ikat, Ajrakh)"],
//                   ["dhoti_pant", "Dhoti Pant"],
//                   ["crop_top_lehenga", "Crop Top with Lehenga"],
//                   ["jacket_lehenga", "Jacket Lehenga / Cape Lehenga"],
//                   ["kurti_jeans", "Kurti with Jeans"],
//                   ["draped_dress", "Draped / Saree-Style Dress"],
//                 ],
//               },
//               {
//                 value: "party_wear",
//                 label: " Party Wear",
//                 examples:
//                   "Cocktail dress, evening gown, party saree, designer lehenga",
//                 subcategories: [
//                   ["cocktail_dress", "Cocktail Dress"],
//                   ["evening_gown", "Evening Gown / Ball Gown"],
//                   ["party_saree", "Party Saree (Shimmer / Net / Organza)"],
//                   ["designer_lehenga", "Designer / Bridal Lehenga"],
//                 ],
//               },
//               {
//                 value: "winter_wear",
//                 label: " Winter Wear",
//                 examples:
//                   "Puffer jacket, hoodie, sweater, leather jacket, parka, poncho",
//                 subcategories: [
//                   ["puffer_jacket", "Puffer / Quilted Jacket"],
//                   ["hoodie", "Hoodie"],
//                   ["sweater", "Sweater / Knit Jumper"],
//                   ["sweatshirt", "Sweatshirt / Crew Neck"],
//                   ["leather_jacket", "Leather / Biker Jacket"],
//                   ["denim_jacket", "Denim Jacket"],
//                   ["parka", "Parka Jacket"],
//                   ["poncho", "Poncho"],
//                   ["general_jacket", "General / Casual Jacket"],
//                 ],
//               },
//               {
//                 value: "casual",
//                 label: " Casual Wear",
//                 examples: "T-shirts, shirts, kurtis, sarees",
//                 subcategories: [
//                   ["tshirt", "T-Shirt / Polo / Graphic Tee"],
//                   ["shirt", "Shirt / Blouse / Button-Up"],
//                   ["kurti", "Kurti / Kurta / Salwar Kameez"],
//                   ["saree", "Saree (Cotton / Silk / Daily Wear)"],
//                 ],
//               },
//               {
//                 value: "watch",
//                 label: " Watches",
//                 examples: "Wristwatches, smartwatches, luxury timepieces",
//                 subcategories: [],
//               },
//               {
//                 value: "jewellery",
//                 label: " Jewellery",
//                 examples: "Rings, necklaces, earrings, bangles",
//                 subcategories: [
//                   ["ring", "Ring"],
//                   ["necklace", "Necklace / Pendant / Chain"],
//                   ["earring", "Earrings (Studs, Jhumka, Drops)"],
//                 ],
//               },
//               {
//                 value: "activewear",
//                 label: " Activewear & Gym Wear",
//                 examples:
//                   "Compression wear, sports bra, joggers, biker shorts, tracksuit",
//                 subcategories: [
//                   ["compression_wear", "Compression Wear / Tights"],
//                   ["tank_top", "Athletic Tank Top"],
//                   ["half_sleeve_tshirt", "Athletic T-Shirt"],
//                   ["regular_gym_lower", "Track Pant / Gym Lower"],
//                   ["baggy_lower", "Baggy Lower / Parachute Pant"],
//                   ["sports_bra", "Sports Bra"],
//                   ["jogger_pants", "Jogger Pants"],
//                   ["gym_shorts", "Gym Shorts / Athletic Shorts"],
//                   ["cycling_shorts", "Cycling Shorts / Biker Shorts"],
//                   ["tracksuit_set", "Tracksuit / Co-ord Set"],
//                   ["zip_up_gym_jacket", "Zip-Up Gym Jacket / Windcheater"],
//                   ["sports_leggings", "Sports Leggings (Mid-Compression)"],
//                 ],
//               },
//               {
//                 value: "headwear_caps",
//                 label: " Headwear & Caps",
//                 examples:
//                   "Baseball cap, snapback, trucker hat, bucket hat, beanie",
//                 subcategories: [
//                   ["baseball_dad_cap", "Baseball Cap / Dad Cap"],
//                   ["snapback_cap", "Snapback Cap (Flat Brim)"],
//                   ["trucker_cap", "Trucker Cap (Mesh Back)"],
//                   ["bucket_hat", "Bucket Hat"],
//                   ["beanie_cap", "Beanie / Skull Cap"],
//                   ["sports_cap", "Sports / Performance Cap"],
//                 ],
//               },

//             ].map((option) => {
//               const selectedEntry = selectedCategories.find(
//                 (entry) => entry.main_category === option.value,
//               );
//               const isSelected = Boolean(selectedEntry);
//               const subcategories = selectedEntry?.subcategories || [];

//               return (
//                 <div
//                   key={option.value}
//                   className={`${styles.categoryItem} ${isSelected ? styles.selected : ""}`}
//                 >
//                   <div className={styles.categoryCheckbox}>
//                     <input
//                       type="checkbox"
//                       checked={isSelected}
//                       onChange={() => toggleCategory(option.value, option.subcategories)}
//                       onClick={(e) => e.stopPropagation()}
//                     />
//                     <div
//                       className={styles.categoryContent}
//                       onClick={() => toggleCategory(option.value, option.subcategories)}
//                     >
//                       <div className={styles.categoryName}>{option.label}</div>
//                       <div className={styles.categoryExamples}>
//                         {option.examples}
//                       </div>
//                     </div>
//                   </div>

//                 </div>
//               );
//             })}
//           </div>

//           <div style={{ textAlign: "center" }}>
//             <button
//               className={styles.tealButton}
//               onClick={saveCategory}
//               disabled={isSavingCategories || !selectedCategories.length}
//             >
//               {isSavingCategories ? "Saving..." : "Continue"}
//             </button>
//           </div>
//         </div>
//       )}

//       {/* instruction guide video  */}

//       {showActivation && !isActive && (
//         <div style={{ textAlign: "center", marginTop: "32px" }}>
//           <h3
//             style={{
//               fontSize: "18px",
//               fontWeight: "600",
//               marginBottom: "12px",
//             }}
//           >
//             How to Add the Try-On Block to Your Product Pages
//           </h3>
//           <video
//             src="https://cdn.shopify.com/videos/c/o/v/8d3ec3a22a01482ca376ea8d8b7b6b0b.mp4"
//             controls
//             style={{ maxWidth: "600px", width: "100%", borderRadius: "8px" }}
//           />
//         </div>
//       )}

//       {/* Activation Section - After Categories Saved */}
//       {showActivation && !isActive && (
//         <div className={styles.activationSection}>
//           <div className={`${styles.statusBadge} ${styles.disabled}`}>
//             ⚠️ Disabled
//           </div>

//           <h2 className={styles.activationTitle}>
//             Add "Try the Look" to Your Product Pages
//           </h2>
//           <p className={styles.activationSubtitle}>
//             Follow these steps to activate the AI virtual try-on feature:
//           </p>

//           <div
//             style={{
//               textAlign: "left",
//               maxWidth: "600px",
//               margin: "0 auto 32px",
//               background: "#F9FAFB",
//               padding: "24px",
//               borderRadius: "8px",
//             }}
//           >
//             <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
//               <li style={{ marginBottom: "12px" }}>
//                 Click "Open Theme Editor" below
//               </li>
//               <li style={{ marginBottom: "12px" }}>
//                 In the left sidebar, find "Try the Look" under Apps
//               </li>
//               <li style={{ marginBottom: "12px" }}>
//                 Drag it to your product page (below product info)
//               </li>
//               <li style={{ marginBottom: "12px" }}>
//                 Click "Save" in the theme editor
//               </li>
//               <li style={{ marginBottom: "0" }}>
//                 Come back here and click "I've Added the Block"
//               </li>
//             </ol>
//           </div>

//           <div
//             style={{
//               display: "flex",
//               gap: "12px",
//               justifyContent: "center",
//               marginBottom: "32px",
//             }}
//           >
//             <button className={styles.tealButton} onClick={activateApp}>
//               Open Theme Editor
//             </button>
//             <button className={styles.tealButton} onClick={confirmActivation}>
//               I've Added the Block
//             </button>
//           </div>

//           {/* Greyed out stats */}
//           <div className={styles.statsDisabled}>
//             <div
//               className={styles.statsCard}
//               style={{ boxShadow: "none", border: "1px solid #E5E7EB" }}
//             >
//               <h3
//                 style={{
//                   fontSize: "18px",
//                   fontWeight: "600",
//                   marginBottom: "16px",
//                   color: "#6B7280",
//                 }}
//               >
//                 Usage Statistics (Inactive)
//               </h3>

//               <div className={styles.statsGrid}>
//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Plan</div>
//                   <div className={styles.statValue}>Free</div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Images Used</div>
//                   <div className={styles.statValue}>0/50</div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Images Generated</div>
//                   <div className={styles.statValue}>0</div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Add to Cart</div>
//                   <div className={styles.statValue}>0</div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Show stats if account exists and app is active */}
//       {loaderData.accountExists &&
//         !showCategorySelection &&
//         !showActivation &&
//         isActive && (
//           <>
//             <div className={styles.statsCard}>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   marginBottom: "24px",
//                 }}
//               >
//                 <div>
//                   <h2
//                     style={{
//                       fontSize: "24px",
//                       fontWeight: "700",
//                       marginBottom: "8px",
//                       color: "#111827",
//                     }}
//                   >
//                     Dashboard
//                   </h2>
//                   <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
//                     Track your AI try-on performance
//                   </p>
//                 </div>
//                 <div className={`${styles.statusBadge} ${styles.active}`}>
//                   ✅ Active
//                 </div>
//               </div>

//               <div className={styles.statsGrid}>
//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Try-On Generated</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.try_on_generated || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Unique Users</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.unique_users || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Add to Cart</div>
//                   <div className={styles.statValue}>
//                     {loaderData.stats?.total_add_to_cart || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Add to Cart Rate</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.add_to_cart_rate || 0}%
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Revenue Metrics Section - NEW */}
//             <div className={styles.statsCard} style={{ marginTop: "20px" }}>
//               {/* Date Range Selector */}
//               <div className={styles.dateRangeBar}>
//                 <span className={styles.dateRangeLabel}>📅 Period:</span>
//                 {[7, 30, 90].map((d) => (
//                   <button
//                     key={d}
//                     className={`${styles.dateRangeBtn} ${selectedDays === d ? styles.dateRangeBtnActive : ""}`}
//                     onClick={() => handleDateRange(d)}
//                   >
//                     Last {d} Days
//                   </button>
//                 ))}
//                 <span className={styles.dateRangeNote}>
//                   {isLoadingRange
//                     ? "Loading..."
//                     : `Showing last ${selectedDays} days`}
//                 </span>
//               </div>

//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   marginBottom: "20px",
//                 }}
//               >
//                 <div>
//                   <h3
//                     style={{
//                       fontSize: "18px",
//                       fontWeight: "600",
//                       marginBottom: "4px",
//                       color: "#111827",
//                     }}
//                   >
//                     Performance Metrics
//                   </h3>
//                   <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
//                     Last synced: {getTimeSinceSync()}
//                   </p>
//                 </div>
//                 <button
//                   className={styles.tealButton}
//                   onClick={handleSyncOrders}
//                   disabled={isSyncingOrders}
//                   style={{ padding: "8px 16px", fontSize: "14px" }}
//                 >
//                   {isSyncingOrders ? "⏳ Syncing..." : "🔄 Sync Orders"}
//                 </button>
//               </div>

//               <div className={styles.statsGrid}>
//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Total Revenue</div>
//                   <div
//                     className={styles.statValue}
//                     style={{ color: "#10B981" }}
//                   >
//                     ₹{loaderData.metrics?.total_revenue?.toFixed(2) || "0.00"}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Total Orders</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.total_orders || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Revenue per Try-On</div>
//                   <div
//                     className={styles.statValue}
//                     style={{ color: "#10B981" }}
//                   >
//                     ₹{loaderData.metrics?.revenue_per_try_on || "0.00"}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Avg Try-On / Product</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.avg_try_on_per_product || 0}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* New Metrics Section - Row 1 */}
//             <div className={styles.statsCard} style={{ marginTop: "20px" }}>
//               <h3
//                 style={{
//                   fontSize: "18px",
//                   fontWeight: "600",
//                   marginBottom: "20px",
//                   color: "#111827",
//                 }}
//               >
//                 Plan & Token Uses
//               </h3>

//               <div className={styles.statsGrid}>
//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Try-On Generated</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.try_on_generated || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Plan</div>
//                   <div className={styles.statValue}>
//                     {loaderData.shopStatus?.plan_type || "test"}
//                     {/* {loaderData.plan_type || loaderData} */}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Images Used</div>
//                   <div className={styles.statValue}>
//                     {loaderData.usage?.used || 0}/
//                     {loaderData.usage?.limit || 50}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Add to Cart Count</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.add_to_cart_count || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Credit Remaining</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.credit_remaining || 0}
//                   </div>
//                 </div>

//                 <div className={styles.statItem}>
//                   <div className={styles.statLabel}>Credit Used</div>
//                   <div className={styles.statValue}>
//                     {loaderData.metrics?.credit_used || 0}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Top Products Table */}
//             {loaderData.top_products && loaderData.top_products.length > 0 && (
//               <div className={styles.statsCard} style={{ marginTop: "20px" }}>
//                 <h3
//                   style={{
//                     fontSize: "18px",
//                     fontWeight: "600",
//                     marginBottom: "20px",
//                     color: "#111827",
//                   }}
//                 >
//                   🏆 Top 5 Products
//                 </h3>

//                 <div style={{ overflowX: "auto" }}>
//                   <table style={{ width: "100%", borderCollapse: "collapse" }}>
//                     <thead>
//                       <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
//                         <th
//                           style={{
//                             padding: "12px",
//                             textAlign: "left",
//                             fontSize: "14px",
//                             fontWeight: "600",
//                             color: "#6B7280",
//                           }}
//                         >
//                           Product Name
//                         </th>
//                         <th
//                           style={{
//                             padding: "12px",
//                             textAlign: "center",
//                             fontSize: "14px",
//                             fontWeight: "600",
//                             color: "#6B7280",
//                           }}
//                         >
//                           Try-Ons
//                         </th>
//                         <th
//                           style={{
//                             padding: "12px",
//                             textAlign: "center",
//                             fontSize: "14px",
//                             fontWeight: "600",
//                             color: "#6B7280",
//                           }}
//                         >
//                           Add to Cart Rate
//                         </th>
//                         <th
//                           style={{
//                             padding: "12px",
//                             textAlign: "center",
//                             fontSize: "14px",
//                             fontWeight: "600",
//                             color: "#6B7280",
//                           }}
//                         >
//                           Add to Cart Count
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {loaderData.top_products.map((product, index) => (
//                         <tr
//                           key={index}
//                           style={{ borderBottom: "1px solid #F3F4F6" }}
//                         >
//                           <td
//                             style={{
//                               padding: "12px",
//                               fontSize: "14px",
//                               color: "#111827",
//                             }}
//                           >
//                             {product.product_name}
//                           </td>
//                           <td
//                             style={{
//                               padding: "12px",
//                               textAlign: "center",
//                               fontSize: "14px",
//                               fontWeight: "600",
//                               color: "#329580",
//                             }}
//                           >
//                             {product.try_on_count}
//                           </td>
//                           <td
//                             style={{
//                               padding: "12px",
//                               textAlign: "center",
//                               fontSize: "14px",
//                               color: "#111827",
//                             }}
//                           >
//                             {product.conversion_rate}%
//                           </td>
//                           <td
//                             style={{
//                               padding: "12px",
//                               textAlign: "center",
//                               fontSize: "14px",
//                               color: "#111827",
//                             }}
//                           >
//                             {product.add_to_cart_count}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

         
//           </>
//         )} 

//       {/* Show activation section if account exists but app is disabled */}
//       {loaderData.accountExists &&
//         !showCategorySelection &&
//         !showActivation &&
//         !isActive &&
//         hasCategory && (
//           <div className={styles.activationSection}>
//             <div className={`${styles.statusBadge} ${styles.disabled}`}>
//               ⚠️ Disabled
//             </div>

//             <h2 className={styles.activationTitle}>
//               Add "Try the Look" to Your Product Pages
//             </h2>
//             <p className={styles.activationSubtitle}>
//               Follow these steps to activate the AI virtual try-on feature:
//             </p>

//             <div
//               style={{
//                 textAlign: "left",
//                 maxWidth: "600px",
//                 margin: "0 auto 32px",
//                 background: "#F9FAFB",
//                 padding: "24px",
//                 borderRadius: "8px",
//               }}
//             >
//               <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.8" }}>
//                 <li style={{ marginBottom: "12px" }}>
//                   Click "Open Theme Editor" below
//                 </li>
//                 <li style={{ marginBottom: "12px" }}>
//                   In the left sidebar, find "Try the Look" under Apps
//                 </li>
//                 <li style={{ marginBottom: "12px" }}>
//                   Drag it to your product page (below Buy Button)
//                 </li>
//                 <li style={{ marginBottom: "12px" }}>
//                   Click "Save" in the theme editor
//                 </li>
//                 <li style={{ marginBottom: "0" }}>
//                   Come back here and click "I've Added the Block"
//                 </li>
//               </ol>
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 gap: "12px",
//                 justifyContent: "center",
//                 marginBottom: "32px",
//               }}
//             >
//               <button className={styles.tealButton} onClick={activateApp}>
//                 Open Theme Editor
//               </button>
//               <button className={styles.tealButton} onClick={confirmActivation}>
//                 I've Added the Block
//               </button>
//             </div>

//             {/* Greyed out stats */}
//             <div className={styles.statsDisabled}>
//               <div
//                 className={styles.statsCard}
//                 style={{ boxShadow: "none", border: "1px solid #E5E7EB" }}
//               >
//                 <h3
//                   style={{
//                     fontSize: "18px",
//                     fontWeight: "600",
//                     marginBottom: "16px",
//                     color: "#6B7280",
//                   }}
//                 >
//                   Usage Statistics (Inactive)
//                 </h3>

//                 <div className={styles.statsGrid}>
//                   <div className={styles.statItem}>
//                     <div className={styles.statLabel}>Plan</div>
//                     <div className={styles.statValue}>
//                       {loaderData.shopStatus?.plan || "Free"}
//                     </div>
//                   </div>

//                   <div className={styles.statItem}>
//                     <div className={styles.statLabel}>Images Used</div>
//                     <div className={styles.statValue}>
//                       {loaderData.usage?.used || 0}/
//                       {loaderData.usage?.limit || 50}
//                     </div>
//                   </div>

//                   <div className={styles.statItem}>
//                     <div className={styles.statLabel}>Images Generated</div>
//                     <div className={styles.statValue}>
//                       {loaderData.stats?.total_images_generated || 0}
//                     </div>
//                   </div>

//                   <div className={styles.statItem}>
//                     <div className={styles.statLabel}>Add to Cart</div>
//                     <div className={styles.statValue}>
//                       {loaderData.stats?.total_add_to_cart || 0}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//     </s-page>
//   );
// }

// export const headers = (headersArgs) => {
//   return boundary.headers(headersArgs);
// };



import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import styles from "./dashboard.module.css";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Handle Shopify App Pricing return URL
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  const planHandle = url.searchParams.get("plan_handle");

  if (chargeId && planHandle) {
    console.log(`💳 Plan activated — shop: ${shopDomain} | plan: ${planHandle} | charge: ${chargeId}`);
    const planMap = {
      standard: { plan_type: "Starter", images_limit: 500 },
      growth:   { plan_type: "growth",  images_limit: 1000 },
      scale:    { plan_type: "pro",     images_limit: 10000 },
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
      shopEmail = data.data.shop.contactEmail || data.data.shop.email || shopEmail;
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
      const predRes = await fetch(`${backendUrl}/api/shop-status/${shopDomain}/predicted-impact`);
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
        shopEmail = data.data.shop.contactEmail || data.data.shop.email || shopEmail;
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
        body: JSON.stringify({ shop_domain: shopDomain, shop_email: shopEmail, shop_name: shopName }),
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "accountCreated" };
      }
      return { success: false, error: data.error || "Failed to create account" };
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
        body: JSON.stringify({ shop_domain: shopDomain, phone_number: phoneNumber, whatsapp_number: whatsappNumber }),
      });
      const data = await response.json();
      if (data.success) {
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
      try { categories = JSON.parse(categoriesValue); } catch { categories = []; }
    } else if (categoryValue) {
      categories = [{ main_category: categoryValue, subcategories: [] }];
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${backendUrl}/api/merchant/save-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_domain: shopDomain,
          categories,
          category: categories[0]?.main_category || categoryValue,
        }),
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "categoriesSaved" };
      }
      return { success: false, error: data.error || "Failed to save categories" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  if (actionType === "updateAppStatus") {
    const shopDomain = formData.get("shop_domain");
    const status = formData.get("status");

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${backendUrl}/api/merchant/update-app-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop_domain: shopDomain, status }),
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, step: "appStatusUpdated" };
      }
      return { success: false, error: data.error || "Failed to update app status" };
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
  const revalidator = useRevalidator();
  const shopify = useAppBridge();

  // App status and setup states
  const appStatus = loaderData.shopStatus?.app_status || "disabled";
  const isActive = appStatus === "active";
  const hasAccount = loaderData.accountExists;
  const hasCategory = Boolean(
    loaderData.shopStatus?.product_category ||
    loaderData.shopStatus?.product_categories?.length
  );

  // Wizard Step State
  // 0: Welcome / Get Started
  // 1: Category Selection
  // 2: Phone / WhatsApp Contact
  // 3: Virtual Try-On Demo
  // 4: Add Button to Store
  // 5: Dashboard
  const [currentStep, setCurrentStep] = useState(() => {
    if (isActive) return 5;
    if (hasAccount && hasCategory) return 4;
    if (hasAccount) return 1;
    return 0;
  });

  // Category selection state
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Contact details state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Try-on Demo State
  const sampleProducts = [
    { name: "White Ringer Tee", price: "₹699", img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop" },
    { name: "Maroon Polo Shirt", price: "₹799", img: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&auto=format&fit=crop" },
    { name: "Yellow Ringer Tee", price: "₹699", img: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=300&auto=format&fit=crop" },
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
        setCurrentStep(5); // Move to Dashboard
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
    const params = new URLSearchParams({ template: "product", context: "apps" });
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
      shopify.toast.show("Please select at least one category", { isError: true });
      return;
    }
    fetcher.submit(
      {
        actionType: "saveCategories",
        categories: JSON.stringify(selectedCategories),
        shop_domain: loaderData.shop.domain,
      },
      { method: "POST" }
    );
  };

  // Submit Phone Numbers
  const handleSavePhone = () => {
    if (!phoneNumber.trim() || !whatsappNumber.trim()) {
      shopify.toast.show("Please enter both phone and WhatsApp numbers", { isError: true });
      return;
    }
    fetcher.submit(
      {
        actionType: "savePhoneNumbers",
        shop_domain: loaderData.shop.domain,
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim(),
      },
      { method: "POST" }
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
      { method: "POST" }
    );
  };

  // Submit Order Sync
  const handleSyncOrders = () => {
    fetcher.submit({ actionType: "syncOrders" }, { method: "POST" });
  };

  // Category Toggle Helper
  const toggleCategory = (mainCategory, allSubcategories = []) => {
    setSelectedCategories((current) => {
      const exists = current.find((entry) => entry.main_category === mainCategory);
      if (exists) {
        return current.filter((entry) => entry.main_category !== mainCategory);
      }
      const subKeys = allSubcategories.map((s) => s[0]);
      return [...current, { main_category: mainCategory, subcategories: subKeys }];
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
    const diffMins = Math.floor((Date.now() - new Date(lastSyncTime).getTime()) / 60000);
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
            {loaderData.usage ? `${loaderData.usage.limit - loaderData.usage.used} credits left` : '50 free credits'}
          </span>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className={styles.layout}>

        {/* LEFT SIDEBAR (WIZARD STEPS) */}
        <div className={styles.sidebar}>
          <div className={styles.ssLabel}>Setup Wizard</div>

          <div
            className={`${styles.stepItem} ${currentStep === 0 ? styles.stepAct : ''} ${currentStep > 0 ? styles.stepDone : ''}`}
            onClick={() => setCurrentStep(0)}
          >
            <div className={styles.siDot}>{currentStep > 0 ? '✓' : '1'}</div>
            <div className={styles.siLabel}>Get Started</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 1 ? styles.stepAct : ''} ${currentStep > 1 ? styles.stepDone : ''}`}
            onClick={() => hasAccount && setCurrentStep(1)}
          >
            <div className={styles.siDot}>{currentStep > 1 ? '✓' : '2'}</div>
            <div className={styles.siLabel}>Categories</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 2 ? styles.stepAct : ''} ${currentStep > 2 ? styles.stepDone : ''}`}
            onClick={() => hasAccount && setCurrentStep(2)}
          >
            <div className={styles.siDot}>{currentStep > 2 ? '✓' : '3'}</div>
            <div className={styles.siLabel}>Contact info</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 3 ? styles.stepAct : ''} ${currentStep > 3 ? styles.stepDone : ''}`}
            onClick={() => hasAccount && setCurrentStep(3)}
          >
            <div className={styles.siDot}>{currentStep > 3 ? '✓' : '4'}</div>
            <div className={styles.siLabel}>Try it on</div>
          </div>

          <div
            className={`${styles.stepItem} ${currentStep === 4 ? styles.stepAct : ''} ${isActive ? styles.stepDone : ''}`}
            onClick={() => hasAccount && setCurrentStep(4)}
          >
            <div className={styles.siDot}>{isActive ? '✓' : '5'}</div>
            <div className={styles.siLabel}>Add button</div>
          </div>

          <div className={styles.ssDivider} />
          <div className={styles.ssLabel}>Main App</div>

          <div
            className={`${styles.stepItem} ${currentStep === 5 ? styles.stepAct : ''}`}
            onClick={() => isActive && setCurrentStep(5)}
          >
            <div className={styles.siDot}>📊</div>
            <div className={styles.siLabel}>Dashboard</div>
          </div>
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className={styles.mainArea}>

          {/* ════ SCREEN 0: WELCOME / HERO ════ */}
          {currentStep === 0 && (
            <div className={styles.panel}>
              <div className={styles.welcomeHero}>
                <div className={styles.wsEyebrow}>✦ AI Virtual Try-On for Shopify</div>
                <h1 className={styles.heroTitle}>
                  Let shoppers see themselves in your products — <span>before they buy</span>
                </h1>
                <p className={styles.heroSubtitle}>
                  Boost conversions by +72% and reduce returns. 50 free try-ons included. Setup takes under 3 minutes.
                </p>

                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <button
                    className={styles.tealButton}
                    onClick={handleStartOnboarding}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Setting up account..." : "Get Started Now →"}
                  </button>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
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
                <div className={styles.phTitle}>Select Your Product Categories</div>
                <div className={styles.phSub}>
                  Select the product categories you sell. Our AI model adapts to these garments.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.categoryGrid}>
                  {[
                    { value: "indo_western", label: "Indo Western", examples: "Jacket kurti, fusion dress, dhoti pant, crop top lehenga", subcategories: [["jacket_kurti", "Jacket Kurti"], ["crop_top_lehenga", "Crop Top Lehenga"]] },
                    { value: "party_wear", label: "Party Wear", examples: "Cocktail dress, evening gown, designer lehenga", subcategories: [["party_saree", "Party Saree"], ["designer_lehenga", "Designer Lehenga"]] },
                    { value: "winter_wear", label: "Winter Wear", examples: "Puffer jacket, hoodie, sweater, leather jacket", subcategories: [["hoodie", "Hoodie"], ["sweater", "Sweater"]] },
                    { value: "casual", label: "Casual Wear", examples: "T-shirts, polo shirts, kurtis, daily sarees", subcategories: [["tshirt", "T-Shirt"], ["kurti", "Kurti"]] },
                    { value: "watch", label: "Watches", examples: "Wristwatches, smartwatches, luxury timepieces", subcategories: [] },
                    { value: "jewellery", label: "Jewellery", examples: "Rings, necklaces, earrings, bangles", subcategories: [["ring", "Ring"], ["necklace", "Necklace"]] },
                    { value: "activewear", label: "Activewear & Gym Wear", examples: "Compression wear, sports bra, joggers, tracksuit", subcategories: [["sports_bra", "Sports Bra"], ["jogger_pants", "Jogger Pants"]] },
                    { value: "headwear_caps", label: "Headwear & Caps", examples: "Baseball cap, snapback, trucker hat, beanie", subcategories: [] },
                  ].map((cat) => {
                    const isSelected = Boolean(selectedCategories.find((c) => c.main_category === cat.value));
                    return (
                      <div
                        key={cat.value}
                        className={`${styles.catCard} ${isSelected ? styles.catCardOn : ''}`}
                        onClick={() => toggleCategory(cat.value, cat.subcategories)}
                      >
                        <div className={styles.catCheck}>{isSelected ? '✓' : ''}</div>
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
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  <b style={{ color: '#008060' }}>{selectedCategories.length}</b> category selected
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
                <div className={styles.phTitle}>Contact Information</div>
                <div className={styles.phSub}>
                  Required: Enter your phone and WhatsApp number for setup support and try-on alerts.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div style={{ maxWidth: '440px', margin: '0 auto' }}>

                  <div className={styles.waAlertBanner}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Alerts you'll receive
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 12px', borderRadius: '8px', color: '#fff', fontSize: '12px' }}>
                      💬 "First try-on generated on your store for White Ringer Tee!"
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Phone Number <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className={styles.textInput}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      WhatsApp Number <span style={{ color: '#EF4444' }}>*</span>
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
                <button className={styles.btnGhost} onClick={() => setCurrentStep(1)}>
                  ← Back
                </button>
                <button
                  className={styles.tealButton}
                  onClick={handleSavePhone}
                  disabled={isSubmitting || !phoneNumber.trim() || !whatsappNumber.trim()}
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
                <div className={styles.phEyebrow}>Step 3 of 4 — Interactive Demo</div>
                <div className={styles.phTitle}>Test the Try-On Experience</div>
                <div className={styles.phSub}>
                  Select a product, upload a photo, and click Generate. This is what your shoppers experience.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.tryonGrid}>
                  {/* Left Column: Product Selection & Photo Upload */}
                  <div>
                    <div className={styles.tgHead}>1. Select Sample Product</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {sampleProducts.map((p, idx) => (
                        <div
                          key={idx}
                          className={`${styles.prodThumb} ${selectedProdIdx === idx ? styles.prodThumbOn : ''}`}
                          onClick={() => setSelectedProdIdx(idx)}
                        >
                          <img src={p.img} alt={p.name} />
                          <div className={styles.ptName}>{p.name}</div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.tgHead}>2. Upload Model Photo</div>
                    <div
                      className={`${styles.uploadBox} ${userPhoto ? styles.uploadBoxHas : ''}`}
                      onClick={() => document.getElementById('demo-file-input').click()}
                    >
                      <input
                        type="file"
                        id="demo-file-input"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      {userPhoto ? (
                        <img src={userPhoto} alt="Uploaded" className={styles.uploadPreviewImg} />
                      ) : (
                        <div>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📸</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
                            Click to upload photo
                          </div>
                          <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                            Full body / Front facing
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      className={styles.tealButton}
                      style={{ width: '100%', marginTop: '16px' }}
                      disabled={!userPhoto || isGenerating}
                      onClick={runDemoGeneration}
                    >
                      {isGenerating ? "Generating..." : "✨ Generate Virtual Try-On"}
                    </button>
                  </div>

                  {/* Right Column: Interactive Generation Progress / Result */}
                  <div className={styles.resultArea}>
                    <div className={styles.tgHead}>Try-On Result</div>
                    {!isGenerating && !tryonDone && (
                      <div className={styles.raEmpty}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                          Result will appear here
                        </div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                          Upload photo and click Generate
                        </div>
                      </div>
                    )}

                    {isGenerating && (
                      <div className={styles.raEmpty}>
                        <div className={styles.spinner} />
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginTop: '12px' }}>
                          {genStageText}
                        </div>
                        <div className={styles.progressBarTrack}>
                          <div className={styles.progressBarFill} style={{ width: `${genProgress}%` }} />
                        </div>
                      </div>
                    )}

                    {tryonDone && !isGenerating && (
                      <div style={{ textAlign: 'center' }}>
                        <img
                          src={sampleProducts[selectedProdIdx].img}
                          alt="Result"
                          className={styles.resultImg}
                        />
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#008060', marginTop: '8px' }}>
                          ✓ AI Try-On Generated Successfully!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div class={styles.panelFoot}>
                <button className={styles.btnGhost} onClick={() => setCurrentStep(2)}>
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
                <div className={styles.phTitle}>Add "Try the Look" Button to Theme</div>
                <div className={styles.phSub}>
                  Follow the video guide below to place the try-on button on your product pages.
                </div>
              </div>
              <div className={styles.panelBody}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <video
                    src="https://cdn.shopify.com/videos/c/o/v/8d3ec3a22a01482ca376ea8d8b7b6b0b.mp4"
                    controls
                    style={{ maxWidth: '580px', width: '100%', borderRadius: '12px', border: '1px solid #E5E7EB' }}
                  />
                </div>

                <div className={styles.installSteps}>
                  <div className={styles.isRow}>
                    <div className={styles.isNum}>1</div>
                    <div>
                      <div className={styles.isTitle}>Click "Open Theme Editor" below</div>
                      <div className={styles.isSub}>It opens your Shopify Product Page template in a new tab.</div>
                    </div>
                  </div>
                  <div className={styles.isRow}>
                    <div className={styles.isNum}>2</div>
                    <div>
                      <div className={styles.isTitle}>Add block → Apps → "Try the Look"</div>
                      <div className={styles.isSub}>Drag the block below your Add to Cart button.</div>
                    </div>
                  </div>
                  <div className={styles.isRow}>
                    <div className={styles.isNum}>3</div>
                    <div>
                      <div className={styles.isTitle}>Click Save in top right</div>
                      <div className={styles.isSub}>Your button goes live instantly for all shoppers.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.panelFoot}>
                <button className={styles.btnGhost} onClick={() => setCurrentStep(3)}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.btnGhost} style={{ border: '1px solid #E5E7EB' }} onClick={openThemeEditor}>
                    🎨 Open Theme Editor
                  </button>
                  <button className={styles.tealButton} onClick={handleConfirmActivation} disabled={isSubmitting}>
                    {isSubmitting ? "Activating..." : "✓ I've Added the Block"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ SCREEN 5: MAIN DASHBOARD ════ */}
          {currentStep === 5 && (
            <div>
              {/* Top Summary Bar */}
              <div className={styles.statsCard} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>
                      Store Performance
                    </h2>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>
                      Last order sync: {getTimeSinceSync()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusDisabled}`}>
                      {isActive ? '✅ Active' : '⚠️ Inactive'}
                    </div>
                    <button className={styles.tealButton} onClick={handleSyncOrders} disabled={isSubmitting}>
                      {isSubmitting ? 'Syncing...' : '🔄 Sync Orders'}
                    </button>
                  </div>
                </div>

                {/* Date Filter */}
                <div className={styles.dateRangeBar}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Period:</span>
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      className={`${styles.dateBtn} ${selectedDays === d ? styles.dateBtnActive : ''}`}
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
                    <div className={styles.statValue}>{loaderData.metrics?.try_on_generated || 0}</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Unique Users</div>
                    <div className={styles.statValue}>{loaderData.metrics?.unique_users || 0}</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Add to Cart Rate</div>
                    <div className={styles.statValue}>{loaderData.metrics?.add_to_cart_rate || 0}%</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Total Revenue</div>
                    <div className={styles.statValue} style={{ color: '#008060' }}>
                      ₹{loaderData.metrics?.total_revenue?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Token / Usage Details */}
              <div className={styles.statsCard} style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Plan & Credit Usage</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Plan Type</div>
                    <div className={styles.statValue}>{loaderData.shopStatus?.plan_type || 'Free Trial'}</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Credits Remaining</div>
                    <div className={styles.statValue}>{loaderData.metrics?.credit_remaining || 0}</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Credits Used</div>
                    <div className={styles.statValue}>{loaderData.metrics?.credit_used || 0}</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Monthly Limit</div>
                    <div className={styles.statValue}>{loaderData.usage?.limit || 50}</div>
                  </div>
                </div>
              </div>

              {/* Top 5 Products Table */}
              {loaderData.top_products && loaderData.top_products.length > 0 && (
                <div className={styles.statsCard}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🏆 Top Products by Try-On</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                          <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#6B7280' }}>Product Name</th>
                          <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>Try-Ons</th>
                          <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>ATC Rate</th>
                          <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#6B7280' }}>ATC Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loaderData.top_products.map((prod, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{prod.product_name}</td>
                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#008060', fontWeight: 700 }}>{prod.try_on_count}</td>
                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{prod.conversion_rate}%</td>
                            <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px' }}>{prod.add_to_cart_count}</td>
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