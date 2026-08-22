// Resource route — proxies the demo try-on generation to the backend.
// URL: POST /app/demo-generate
// Auth: Shopify admin session required (same as all app.* routes)
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  // Ensure the merchant is authenticated
  await authenticate.admin(request);

  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  try {
    // Forward the multipart/form-data body as-is to the backend
    const formData = await request.formData();

    // Build a new FormData to forward (Node's native FormData, available in Node 18+)
    const proxyForm = new FormData();
    for (const [key, value] of formData.entries()) {
      proxyForm.append(key, value);
    }

    const res = await fetch(`${backendUrl}/api/generate-image`, {
      method: "POST",
      body: proxyForm,
    });

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      const errText = contentType.includes("json")
        ? await res.json()
        : { error: await res.text() };
      return new Response(JSON.stringify(errText), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ demo-generate proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
