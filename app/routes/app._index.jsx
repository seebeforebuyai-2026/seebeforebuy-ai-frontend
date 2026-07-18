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
  
  // Fetch actual store owner email from Shopify GraphQL
  let shopEmail = session.email || `${shopDomain.split('.')[0]}@shopify.com`;
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
      shopEmail = data.data.shop.contactEmail || data.data.shop.email || shopEmail;
      shopName = data.data.shop.name || shopName;
      
      console.log('📊 Dashboard loaded for:', shopDomain);
      console.log('   Store Name:', shopName);
      console.log('   Store Email:', shopEmail);
      console.log('   Contact Email:', data.data.shop.contactEmail);
    }
  } catch (error) {
    console.error('⚠️  Could not fetch shop details from Shopify:', error);
    console.log('   Using fallback email:', shopEmail);
  }

  // Check if shop exists in backend
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  try {
    console.log('🔍 Fetching shop status from:', `${backendUrl}/api/shop-status/${shopDomain}`);
    const response = await fetch(`${backendUrl}/api/shop-status/${shopDomain}`);
    const data = await response.json();

    // Fetch predicted impact in parallel
    let predicted = null;
    try {
      const predRes = await fetch(`${backendUrl}/api/shop-status/${shopDomain}/predicted-impact`);
      if (predRes.ok) {
        const predData = await predRes.json();
        predicted = predData.predicted || null;
      }
    } catch { /* non-critical */ }

    console.log('📦 Shop status response:', JSON.stringify(data, null, 2));

    // Auto-sync orders if needed (> 1 hour since last sync)
    const lastSyncTime = data.shopStatus?.order_sync?.last_sync_time;
    const oneHourAgo = Date.now() - 3600000; // 1 hour in milliseconds
    const isSyncing = data.shopStatus?.order_sync?.is_syncing;

    if (data.accountExists && !isSyncing) {
      if (!lastSyncTime || new Date(lastSyncTime).getTime() < oneHourAgo) {
        console.log('🔄 Auto-syncing orders (last sync > 1 hour ago)...');
        
        // Trigger sync in background (don't wait for it)
        fetch(`${backendUrl}/api/sync-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_domain: shopDomain,
            session: {
              shop: session.shop,
              accessToken: session.accessToken,
            },
          }),
        }).catch(err => console.error('Auto-sync error:', err));
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
    console.error('❌ Error checking shop status:', error);
    
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
  const actionType = formData.get('actionType');

  if (actionType === 'createAccount') {
    // Create merchant account in backend
    const shopDomain = session.shop;
    
    // Fetch actual store owner email from Shopify GraphQL
    let shopEmail = session.email || `${shopDomain.split('.')[0]}@shopify.com`;
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
        shopEmail = data.data.shop.contactEmail || data.data.shop.email || shopEmail;
        shopName = data.data.shop.name || shopName;
        
        console.log('🎉 Creating merchant account...');
        console.log('   Shop:', shopDomain);
        console.log('   Store Name:', shopName);
        console.log('   Store Email:', shopEmail);
        console.log('   Contact Email:', data.data.shop.contactEmail);
      }
    } catch (error) {
      console.error('⚠️  Could not fetch shop details:', error);
      console.log('   Using fallback email:', shopEmail);
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${backendUrl}/api/merchant/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          shop_email: shopEmail,
          shop_name: shopName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Account created successfully!');
        return {
          success: true,
          step: 'accountCreated',
          message: 'Account created successfully! Email sent to store owner.',
        };
      } else {
        console.error('❌ Failed to create account:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to create account',
        };
      }
    } catch (error) {
      console.error('❌ Error creating account:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  if (actionType === 'saveCategories') {
    // Save product category to backend (single category)
    const shopDomain = formData.get('shop_domain');
    const category = formData.get('category'); // Single category (not array)

    console.log('💾 Saving product category...');
    console.log('   Shop:', shopDomain);
    console.log('   Category:', category);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${backendUrl}/api/merchant/save-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          category: category, // Single category
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Category saved successfully!');
        return {
          success: true,
          step: 'categoriesSaved',
          message: 'Category saved!',
        };
      } else {
        console.error('❌ Failed to save category:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to save category',
        };
      }
    } catch (error) {
      console.error('❌ Error saving category:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  if (actionType === 'updateAppStatus') {
    // Update app status to active
    const shopDomain = formData.get('shop_domain');
    const status = formData.get('status');

    console.log('🔄 Updating app status...');
    console.log('   Shop:', shopDomain);
    console.log('   Status:', status);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${backendUrl}/api/merchant/update-app-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          status: status,
        }),
      });

      // Check if response is OK
      if (!response.ok) {
        console.error('❌ Backend returned error:', response.status, response.statusText);
        const text = await response.text();
        console.error('   Response:', text);
        return {
          success: false,
          error: `Backend error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ App status updated successfully!');
        return {
          success: true,
          step: 'appStatusUpdated',
          message: 'App activated!',
        };
      } else {
        console.error('❌ Failed to update app status:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to update app status',
        };
      }
    } catch (error) {
      console.error('❌ Error updating app status:', error);
      console.error('   Error details:', error.message);
      return {
        success: false,
        error: `Cannot connect to backend: ${error.message}. Make sure backend is running on port 5000.`,
      };
    }
  }

  if (actionType === 'syncOrders') {
    // Sync orders from Shopify
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    console.log('🔄 Manual sync orders triggered...');
    console.log('   Shop:', shopDomain);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${backendUrl}/api/sync-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.log('✅ Orders synced successfully!');
        return {
          success: true,
          step: 'ordersSynced',
          new_orders: data.new_orders,
          total_orders: data.total_orders,
          total_revenue: data.total_revenue,
          message: data.message,
        };
      } else {
        console.error('❌ Failed to sync orders:', data.error);
        return {
          success: false,
          error: data.message || 'Failed to sync orders',
        };
      }
    } catch (error) {
      console.error('❌ Error syncing orders:', error);
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
  const [selectedCategory, setSelectedCategory] = useState(''); // Single category (not array)
  const [showActivation, setShowActivation] = useState(false);

  const isCreatingAccount = fetcher.state === "submitting";
  const isSavingCategories = fetcher.state === "submitting" && fetcher.formData?.get('actionType') === 'saveCategories';
  const isSyncingOrders = fetcher.state === "submitting" && fetcher.formData?.get('actionType') === 'syncOrders';

  // Get app status from backend
  const appStatus = loaderData.shopStatus?.app_status || 'disabled';
  const isActive = appStatus === 'active';
  
  // Check if category has been selected
  const hasCategory = loaderData.shopStatus?.product_category ? true : false;

  // Get last sync info
  const lastSyncTime = loaderData.shopStatus?.order_sync?.last_sync_time;
  const totalOrdersSynced = loaderData.shopStatus?.order_sync?.total_orders_synced || 0;

  // Calculate time since last sync
  const getTimeSinceSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = Date.now();
    const syncTime = new Date(lastSyncTime).getTime();
    const diffMs = now - syncTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Show success message when account is created
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.step === 'accountCreated') {
      shopify.toast.show("Account created successfully!");
      setShowCategorySelection(true);
    } else if (fetcher.data?.success && fetcher.data?.step === 'categoriesSaved') {
      shopify.toast.show("Categories saved!");
      setShowCategorySelection(false);
      setShowActivation(true);
    } else if (fetcher.data?.success && fetcher.data?.step === 'appStatusUpdated') {
      shopify.toast.show("App activated successfully!");
      console.log('✅ Status updated, revalidating data...');
      // Use setTimeout to ensure toast is shown before revalidating
      setTimeout(() => {
        // Revalidate data without page reload
        revalidator.revalidate();
      }, 1000);
    } else if (fetcher.data?.success && fetcher.data?.step === 'ordersSynced') {
      const newOrders = fetcher.data.new_orders || 0;
      const totalRevenue = fetcher.data.total_revenue || 0;
      
      if (newOrders > 0) {
        shopify.toast.show(`✅ Synced ${newOrders} new orders! Revenue: $${totalRevenue.toFixed(2)}`);
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
      template: 'product',
      context: 'apps'
    });
    
    const themeEditorUrl = `https://${loaderData.shop.domain}/admin/themes/current/editor?${params.toString()}`;
    
    console.log('🎨 Opening theme editor:', themeEditorUrl);
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
        actionType: 'updateAppStatus',
        shop_domain: loaderData.shop.domain,
        status: 'active'
      },
      { method: 'POST' }
    );
  };

  // Function to start integration
  const startIntegration = () => {
    // Create account first
    fetcher.submit(
      { actionType: 'createAccount' },
      { method: 'POST' }
    );
  };

  // Function to toggle category selection (now single selection with radio)
  const selectCategory = (category) => {
    setSelectedCategory(category);
  };

  // Function to save category (single category)
  const saveCategory = () => {
    if (!selectedCategory) {
      shopify.toast.show("Please select a category", { isError: true });
      return;
    }

    fetcher.submit(
      { 
        actionType: 'saveCategories',
        category: selectedCategory, // Single category (not array)
        shop_domain: loaderData.shop.domain
      },
      { method: 'POST' }
    );
  };

  // Function to sync orders manually
  const handleSyncOrders = () => {
    fetcher.submit(
      { actionType: 'syncOrders' },
      { method: 'POST' }
    );
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
              Increase conversions & reduce returns with AI-powered virtual try-on.
            </p>
            <button
              className={styles.tealButton}
              onClick={startIntegration}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? 'Setting up...' : 'Get Started (2 min setup)'}
            </button>
          </div>
        )}

      {/* Category Selection - After Account Creation OR if no category selected */}
      {(showCategorySelection || (loaderData.accountExists && !hasCategory && !isActive)) && (
        <div className={styles.categorySection}>
          <h2 className={styles.categoryTitle}>Select Your Product Category</h2>
          <p className={styles.categorySubtitle}>
            Choose ONE category that best describes your products.
          </p>
          
          <div className={styles.categoryList}>
            {/* Apparel */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'apparel' ? styles.selected : ''}`} onClick={() => selectCategory('apparel')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'apparel'} onChange={() => selectCategory('apparel')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Apparel</div>
                  <div className={styles.categoryExamples}>General clothing — dresses, jackets, coats</div>
                </div>
              </div>
            </div>

            {/* Kurti */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'kurti' ? styles.selected : ''}`} onClick={() => selectCategory('kurti')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'kurti'} onChange={() => selectCategory('kurti')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Kurti / Kurta</div>
                  <div className={styles.categoryExamples}>Kurtis, Kurtas, Salwar Kameez, Anarkali, Tunics</div>
                </div>
              </div>
            </div>

            {/* Saree */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'saree' ? styles.selected : ''}`} onClick={() => selectCategory('saree')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'saree'} onChange={() => selectCategory('saree')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Saree / Lehenga</div>
                  <div className={styles.categoryExamples}>Sarees, Lehengas, Cholis, Ethnic drapes</div>
                </div>
              </div>
            </div>

            {/* T-Shirt */}
            <div className={`${styles.categoryItem} ${selectedCategory === 't_shirt' ? styles.selected : ''}`} onClick={() => selectCategory('t_shirt')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 't_shirt'} onChange={() => selectCategory('t_shirt')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> T-Shirt / Polo</div>
                  <div className={styles.categoryExamples}>T-shirts, Polos, Graphic tees, Crop tops</div>
                </div>
              </div>
            </div>

            {/* Shirt */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'shirt' ? styles.selected : ''}`} onClick={() => selectCategory('shirt')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'shirt'} onChange={() => selectCategory('shirt')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Shirt / Blouse</div>
                  <div className={styles.categoryExamples}>Button-up shirts, Formal shirts, Blouses</div>
                </div>
              </div>
            </div>

            {/* Suit */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'suit' ? styles.selected : ''}`} onClick={() => selectCategory('suit')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'suit'} onChange={() => selectCategory('suit')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Suit / Blazer</div>
                  <div className={styles.categoryExamples}>Suits, Blazers, Waistcoats, Tuxedos</div>
                </div>
              </div>
            </div>

            {/* Streetwear */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'streetwear' ? styles.selected : ''}`} onClick={() => selectCategory('streetwear')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'streetwear'} onChange={() => selectCategory('streetwear')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Streetwear</div>
                  <div className={styles.categoryExamples}>Hoodies, Sweatshirts, Cargo pants, Joggers</div>
                </div>
              </div>
            </div>

            {/* Watch */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'watch' ? styles.selected : ''}`} onClick={() => selectCategory('watch')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'watch'} onChange={() => selectCategory('watch')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Watch</div>
                  <div className={styles.categoryExamples}>Wristwatches, Smartwatches, Luxury timepieces</div>
                </div>
              </div>
            </div>

            {/* Shoes */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'shoes' ? styles.selected : ''}`} onClick={() => selectCategory('shoes')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'shoes'} onChange={() => selectCategory('shoes')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}>Shoes / Sneakers</div>
                  <div className={styles.categoryExamples}>Sneakers, Boots, Heels, Loafers, Trainers</div>
                </div>
              </div>
            </div>

            {/* Jewellery */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'jewellery' ? styles.selected : ''}`} onClick={() => selectCategory('jewellery')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'jewellery'} onChange={() => selectCategory('jewellery')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Jewellery</div>
                  <div className={styles.categoryExamples}>Rings, Earrings, Necklaces, Bracelets, Bangles</div>
                </div>
              </div>
            </div>

            {/* Footwear */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'footwear' ? styles.selected : ''}`} onClick={() => selectCategory('footwear')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'footwear'} onChange={() => selectCategory('footwear')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Footwear</div>
                  <div className={styles.categoryExamples}>Sandals, Formal shoes, Sports shoes, Flats</div>
                </div>
              </div>
            </div>

            {/* Accessories */}
            <div className={`${styles.categoryItem} ${selectedCategory === 'accessories' ? styles.selected : ''}`} onClick={() => selectCategory('accessories')}>
              <div className={styles.categoryCheckbox}>
                <input type="radio" name="category" checked={selectedCategory === 'accessories'} onChange={() => selectCategory('accessories')} onClick={(e) => e.stopPropagation()} />
                <div className={styles.categoryContent}>
                  <div className={styles.categoryName}> Accessories</div>
                  <div className={styles.categoryExamples}>Bags, Hats, Belts, Sunglasses, Scarves</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <button
              className={styles.tealButton}
              onClick={saveCategory}
              disabled={isSavingCategories || !selectedCategory}
            >
              {isSavingCategories ? 'Saving...' : 'Continue'}
            </button>
          </div>
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
          
          <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto 32px', background: '#F9FAFB', padding: '24px', borderRadius: '8px' }}>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              <li style={{ marginBottom: '12px' }}>Click "Open Theme Editor" below</li>
              <li style={{ marginBottom: '12px' }}>In the left sidebar, find "Try the Look" under Apps</li>
              <li style={{ marginBottom: '12px' }}>Drag it to your product page (below product info)</li>
              <li style={{ marginBottom: '12px' }}>Click "Save" in the theme editor</li>
              <li style={{ marginBottom: '0' }}>Come back here and click "I've Added the Block"</li>
            </ol>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <button className={styles.tealButton} onClick={activateApp}>
              Open Theme Editor
            </button>
            <button 
              className={styles.tealButton} 
              onClick={confirmActivation}
            >
              I've Added the Block
            </button>
          </div>
          
          {/* Greyed out stats */}
          <div className={styles.statsDisabled}>
            <div className={styles.statsCard} style={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#6B7280' }}>
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
      {loaderData.accountExists && !showCategorySelection && !showActivation && isActive && (
        <>
          <div className={styles.statsCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
                   Dashboard
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
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
                <div className={styles.statValue}>{loaderData.metrics?.try_on_generated || 0}</div>
              </div>

               <div className={styles.statItem}>
                <div className={styles.statLabel}>Unique Users</div>
                <div className={styles.statValue}>{loaderData.metrics?.unique_users || 0}</div>
              </div>

              
              {/* <div className={styles.statItem}>
                <div className={styles.statLabel}>Images Generated</div>
                <div className={styles.statValue}>{loaderData.stats?.total_images_generated || 0}</div>
              </div> */}

              
              
              
               <div className={styles.statItem}>
                <div className={styles.statLabel}>Add to Cart</div>
                <div className={styles.statValue}>{loaderData.stats?.total_add_to_cart || 0}</div>
              </div>


                <div className={styles.statItem}>
                <div className={styles.statLabel}>Add to Cart Rate</div>
                <div className={styles.statValue}>{loaderData.metrics?.add_to_cart_rate || 0}%</div>
              </div>


            </div>
          </div>

  {/* Revenue Metrics Section - NEW */}
          <div className={styles.statsCard} style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', color: '#111827' }}>
                  Performance Metrics

                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                  Last synced: {getTimeSinceSync()} • Total orders: {totalOrdersSynced}
                </p>
              </div>
              <button
                className={styles.tealButton}
                onClick={handleSyncOrders}
                disabled={isSyncingOrders}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                {isSyncingOrders ? '⏳ Syncing...' : '🔄 Sync Orders'}
              </button>
            </div>
            
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Total Revenue</div>
                <div className={styles.statValue} style={{ color: '#10B981' }}>
                  ₹{loaderData.metrics?.total_revenue?.toFixed(2) || '0.00'}
                </div>
              </div>
              
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Total Orders</div>
                <div className={styles.statValue}>{loaderData.metrics?.total_orders || 0}</div>
              </div>
              
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Revenue per Try-On</div>
                <div className={styles.statValue} style={{ color: '#10B981' }}>
                  ₹{loaderData.metrics?.revenue_per_try_on || '0.00'}
                </div>
              </div>

 <div className={styles.statItem}>
                <div className={styles.statLabel}>Avg Try-On / Product</div>
                <div className={styles.statValue}>{loaderData.metrics?.avg_try_on_per_product || 0}</div>
              </div>

            </div>
          </div>


          {/* New Metrics Section - Row 1 */}
          <div className={styles.statsCard} style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
              Plan & Token Uses
            </h3>
            
            <div className={styles.statsGrid}>
              {/* <div className={styles.statItem}>
                <div className={styles.statLabel}>Try-On Generated</div>
                <div className={styles.statValue}>{loaderData.metrics?.try_on_generated || 0}</div>
              </div> */}
              

              
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Plan</div>
                <div className={styles.statValue}>{loaderData.shopStatus?.plan || 'Free'}</div>
              </div>
              
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Images Used</div>
                <div className={styles.statValue}>
                  {loaderData.usage?.used || 0}/{loaderData.usage?.limit || 50}
                </div>
              </div>
             
              
              {/* <div className={styles.statItem}>
                <div className={styles.statLabel}>Add to Cart Count</div>
                <div className={styles.statValue}>{loaderData.metrics?.add_to_cart_count || 0}</div>
              </div>
               */}
            
              
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Credit Remaining</div>
                <div className={styles.statValue}>{loaderData.metrics?.credit_remaining || 0}</div>
              </div>

              <div className={styles.statItem}>
                <div className={styles.statLabel}>Credit Used</div>
                <div className={styles.statValue}>{loaderData.metrics?.credit_used || 0}</div>
              </div>

             
            </div>
          </div>

        
          {/* Predicted Impact Section */}
          <div className={styles.statsCard} style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000000ff', margin: 0 }}>
                Performance Metrics

              </h3>
              <span style={{ background: '#EDE9FE', color: '#329580', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>
                Revenue
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#000000ff', marginBottom: '20px' }}>
              Track your AI try-on performance

 
            </p>
            <div className={styles.statsGrid}>
              <div className={styles.statItem} style={{ borderTop: '3px solid #329580' }}>
                <div className={styles.statLabel}>Orders</div>
                <div className={styles.statValue} style={{ color: '#329580' }}>
                  {loaderData.predicted?.orders_via_app ?? '—'}
                </div>
              </div>
              <div className={styles.statItem} style={{ borderTop: '3px solid #329580' }}>
                <div className={styles.statLabel}>Revenue</div>
                <div className={styles.statValue} style={{ color: '#329580' }}>
                  ₹{loaderData.predicted?.revenue_via_app?.toFixed(2) ?? '—'}
                </div>
              </div>
              <div className={styles.statItem} style={{ borderTop: '3px solid #329580' }}>
                <div className={styles.statLabel}>Unique Users </div>
                <div className={styles.statValue} style={{ color: '#329580' }}>
                  {loaderData.predicted?.unique_users ?? '—'}
                </div>
              </div>
              <div className={styles.statItem} style={{ borderTop: '3px solid #329580' }}>
                <div className={styles.statLabel}>Try-Ons Generated </div>
                <div className={styles.statValue} style={{ color: '#329580' }}>
                  {loaderData.predicted?.try_ons_generated ?? '—'}
                </div>
              </div>
              <div className={styles.statItem} style={{ borderTop: '3px solid #329580' }}>
                <div className={styles.statLabel}>Revenue per Try-On </div>
                <div className={styles.statValue} style={{ color: '#329580' }}>
                  ₹{loaderData.predicted?.revenue_per_try_on ?? '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          {loaderData.top_products && loaderData.top_products.length > 0 && (
            <div className={styles.statsCard} style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
                🏆 Top 5 Products
              </h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                        Product Name
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                        Try-Ons
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                        Add to Cart Rate
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>
                        Add to Cart Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loaderData.top_products.map((product, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                          {product.product_name}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#329580' }}>
                          {product.try_on_count}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827' }}>
                          {product.conversion_rate}%
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827' }}>
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
      {loaderData.accountExists && !showCategorySelection && !showActivation && !isActive && hasCategory && (
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
          
          <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto 32px', background: '#F9FAFB', padding: '24px', borderRadius: '8px' }}>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              <li style={{ marginBottom: '12px' }}>Click "Open Theme Editor" below</li>
              <li style={{ marginBottom: '12px' }}>In the left sidebar, find "Try the Look" under Apps</li>
              <li style={{ marginBottom: '12px' }}>Drag it to your product page (below Buy Button)</li>
              <li style={{ marginBottom: '12px' }}>Click "Save" in the theme editor</li>
              <li style={{ marginBottom: '0' }}>Come back here and click "I've Added the Block"</li>
            </ol>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <button className={styles.tealButton} onClick={activateApp}>
               Open Theme Editor
            </button>
            <button 
              className={styles.tealButton} 
              onClick={confirmActivation}
            >
               I've Added the Block
            </button>
          </div>
          
          {/* Greyed out stats */}
          <div className={styles.statsDisabled}>
            <div className={styles.statsCard} style={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#6B7280' }}>
                Usage Statistics (Inactive)
              </h3>
              
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Plan</div>
                  <div className={styles.statValue}>{loaderData.shopStatus?.plan || 'Free'}</div>
                </div>
                
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Images Used</div>
                  <div className={styles.statValue}>
                    {loaderData.usage?.used || 0}/{loaderData.usage?.limit || 50}
                  </div>
                </div>
                
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Images Generated</div>
                  <div className={styles.statValue}>{loaderData.stats?.total_images_generated || 0}</div>
                </div>
                
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Add to Cart</div>
                  <div className={styles.statValue}>{loaderData.stats?.total_add_to_cart || 0}</div>
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

