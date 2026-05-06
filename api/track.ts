export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    // Vercel logs (view in Deployments -> Functions logs)
    console.log("track", JSON.stringify(body));
  } catch {
    // ignore
  }
  return res.status(204).end();
}

