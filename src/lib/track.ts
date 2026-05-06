import { getTelegramWebApp } from "./telegram";

export type TrackEvent =
  | "paywall_view"
  | "checkout_start"
  | "payment_success"
  | "payment_cancel"
  | "payment_fail";

export function track(event: TrackEvent, props?: Record<string, unknown>) {
  try {
    const tg = getTelegramWebApp();
    const payload = {
      event,
      props: props ?? {},
      ts: Date.now(),
      platform: tg?.platform,
    };
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

