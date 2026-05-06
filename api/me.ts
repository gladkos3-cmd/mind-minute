import { verifyTelegramInitData } from "./_lib/telegramInitData";
import { getPremiumUntilMs } from "./_lib/premiumStore";

export default async function handler(req: any, res: any) {
  try {
    const initData = String(req.headers["x-telegram-init-data"] ?? "");
    const token = process.env.BOT_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing BOT_TOKEN" });
    if (!initData) return res.status(401).json({ premium: false, premiumUntilMs: 0 });

    const auth = verifyTelegramInitData(initData, token);
    const premiumUntilMs = await getPremiumUntilMs(auth.userId);
    return res.status(200).json({ premium: Date.now() < premiumUntilMs, premiumUntilMs });
  } catch (e) {
    return res.status(401).json({ premium: false, premiumUntilMs: 0 });
  }
}

