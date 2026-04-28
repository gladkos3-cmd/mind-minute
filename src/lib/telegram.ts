type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  initData?: string;
  initDataUnsafe?: unknown;
  colorScheme?: "light" | "dark";
  platform?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram(): { isTelegram: boolean } {
  const tg = getTelegramWebApp();
  if (!tg) return { isTelegram: false };
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#0b0f17");
    tg.setBackgroundColor?.("#0b0f17");
  } catch {
    // no-op: allow running in browser without Telegram.
  }
  return { isTelegram: true };
}

export function hapticLight() {
  const tg = getTelegramWebApp();
  try {
    tg?.HapticFeedback?.impactOccurred("light");
  } catch {
    // ignore
  }
}

