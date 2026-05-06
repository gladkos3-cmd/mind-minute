import { verifyTelegramInitData } from "./_lib/telegramInitData";

type PremiumSku = "premium_month" | "premium_year";

function product(sku: PremiumSku) {
  switch (sku) {
    case "premium_month":
      return { title: "Mind Minute Premium — 1 месяц", description: "Длинные практики и расширенные возможности.", amountKopeks: 19900 };
    case "premium_year":
      return { title: "Mind Minute Premium — 1 год", description: "Длинные практики и расширенные возможности.", amountKopeks: 149000 };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = process.env.BOT_TOKEN;
    const providerToken = process.env.TELEGRAM_PROVIDER_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing BOT_TOKEN" });
    if (!providerToken) return res.status(500).json({ error: "Missing TELEGRAM_PROVIDER_TOKEN" });

    const initData = String(req.headers["x-telegram-init-data"] ?? "");
    if (!initData) return res.status(401).json({ error: "Missing initData" });
    const auth = verifyTelegramInitData(initData, token);

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const sku = String(body?.sku ?? "") as PremiumSku;
    if (sku !== "premium_month" && sku !== "premium_year") return res.status(400).json({ error: "Bad sku" });

    const p = product(sku);
    const payload = JSON.stringify({ sku, userId: auth.userId, ts: Date.now() });

    const r = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: p.title,
        description: p.description,
        payload,
        provider_token: providerToken,
        currency: "RUB",
        prices: [{ label: p.title, amount: p.amountKopeks }],
      }),
    });
    const j = await r.json();
    if (!j.ok) return res.status(500).json({ error: "Telegram createInvoiceLink failed", details: j });
    return res.status(200).json({ invoiceLink: j.result as string });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Checkout failed" });
  }
}

