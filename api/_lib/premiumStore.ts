type PremiumRecord = {
  premiumUntilMs: number;
};

const memory = new Map<number, PremiumRecord>();

function upstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function upstashCommand<T>(cmd: string, args: Array<string | number>) {
  const cfg = upstash();
  if (!cfg) throw new Error("Upstash not configured");
  const url = `${cfg.url}/${cmd}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}`);
  const json = (await res.json()) as { result: T };
  return json.result;
}

function key(userId: number) {
  return `mm:premium:${userId}`;
}

export async function getPremiumUntilMs(userId: number): Promise<number> {
  const cfg = upstash();
  if (!cfg) return memory.get(userId)?.premiumUntilMs ?? 0;
  const v = await upstashCommand<string | null>("get", [key(userId)]);
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function setPremiumUntilMs(userId: number, premiumUntilMs: number) {
  const cfg = upstash();
  if (!cfg) {
    memory.set(userId, { premiumUntilMs });
    return;
  }
  await upstashCommand("set", [key(userId), premiumUntilMs]);
}

