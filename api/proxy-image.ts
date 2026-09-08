// Vercel Serverless Function Handler for /api/proxy-image
// Proxies external circuit diagram images to bypass CORS in browser preview and Google Lens reading
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const targetUrl = req.query?.url as string;
  if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.startsWith("http")) {
    return res.status(400).json({ error: "Valid HTTP(S) image URL required" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const fetched = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!fetched.ok) {
      return res.status(fetched.status).json({ error: `Failed to fetch image: ${fetched.statusText}` });
    }

    const cType = fetched.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", cType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const arrayBuffer = await fetched.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to proxy image" });
  }
}
