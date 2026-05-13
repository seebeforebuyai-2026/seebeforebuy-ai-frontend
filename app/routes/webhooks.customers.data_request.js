import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`📋 GDPR Data Request received for shop: ${shop}`);
  console.log(`   Customer ID: ${payload.customer?.id}`);
  console.log(`   Email: ${payload.customer?.email}`);

  // TODO: Implement data export logic
  // For now, just acknowledge receipt
  // In production, you should:
  // 1. Collect all customer data from your database
  // 2. Send it to the customer via email

  return new Response(null, { status: 200 });
};
