// Vercel Serverless Function Handler for /api/health
export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return res.status(200).json({
    status: "ok",
    service: "CircuitForge EDA Backend",
    runtime: "Vercel Serverless Function",
    timestamp: new Date().toISOString(),
  });
}
