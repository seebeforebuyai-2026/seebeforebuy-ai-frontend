import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // If Shopify is sending a shop param, redirect to auth
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // Redirect root visitors to Shopify App Store listing
  throw redirect("https://apps.shopify.com/see-before-buy-ai");
};

export default function App() {
  return null;
}
