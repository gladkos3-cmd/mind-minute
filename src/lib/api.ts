import { getTelegramInitData } from "./telegram";

export async function apiGet<T>(path: string): Promise<T> {
  const initData = getTelegramInitData();
  const res = await fetch(path, {
    headers: initData ? { "x-telegram-init-data": initData } : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const initData = getTelegramInitData();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(initData ? { "x-telegram-init-data": initData } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

