import { authenticate } from "../shopify.server";

/**
 * ============================================
 * WEBHOOK: App Installed
 * ============================================
 * 
 * This webhook is triggered when a merchant installs the app.
 * We use it to automatically create their account in our backend.
 * 
 * Flow:
 * 1. Merchant installs app from Shopify App Store
 * 2. Shopify calls this webhook
 * 3. We call our backend to create merchant account
 * 4. Backend creates shop in DynamoDB
 * 5. Backend generates temporary password
 * 6. Backend sends welcome email with credentials
 */

export const action = async ({ request }) => {
  try {
    // Authenticate the webhook request from Shopify
    const { shop, session, topic } = await authenticate.webhook(request);

    console.log('🎉 App installed webhook received!');
    console.log('   Shop:', shop);
    console.log('   Topic:', topic);

    // Get shop information from session
    const shopEmail = session?.email || `${shop.split('.')[0]}@shopify.com`;
    const shopName = session?.shop || shop;

    console.log('📧 Shop email:', shopEmail);
    console.log('🏪 Shop name:', shopName);

    // Call backend to create merchant account
    console.log('📤 Calling backend to create merchant account...');
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    const response = await fetch(`${backendUrl}/api/merchant/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shop_domain: shop,
        shop_email: shopEmail,
        shop_name: shopName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend onboarding failed:', response.status, errorText);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Merchant account created successfully!');
    console.log('   Email:', data.credentials?.email);
    console.log('   Temporary password:', data.credentials?.temporary_password);
    console.log('   Email sent:', data.email_sent);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in app/installed webhook:', error);
    
    // Return 200 anyway so Shopify doesn't retry
    // (We'll handle errors gracefully)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
