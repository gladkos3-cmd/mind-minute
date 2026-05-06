import crypto from "node:crypto";

export type TelegramAuth = {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
};

function parseQuery(qs: string) {
  const out = new Map<string, string>();
  for (const part of qs.split("&")) {
    if (!part) continue;
    const idx = part.indexOf("=");
    const k = idx === -1 ? part : part.slice(0, idx);
    const v = idx === -1 ? "" : part.slice(idx + 1);
    out.set(decodeURIComponent(k), decodeURIComponent(v));
  }
  return out;
}

export function verifyTelegramInitData(initData: string, botToken: string): TelegramAuth {
  const params = parseQuery(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing hash");

  const dataCheckString = Array.from(params.entries())
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computed !== hash) throw new Error("Bad initData hash");

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Missing user");
  const user = JSON.parse(userRaw) as { id: number; username?: string; first_name?: string; last_name?: string };

  return {
    userId: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
  };
}

