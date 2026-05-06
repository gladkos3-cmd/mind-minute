export type PremiumSku = "premium_month" | "premium_year";

export const PREMIUM_FREE_MAX_SEC = 180;

export const PREMIUM_PRODUCTS: Array<{
  sku: PremiumSku;
  title: string;
  description: string;
  priceRub: number;
  days: number;
}> = [
  {
    sku: "premium_month",
    title: "Mind Minute Premium — 1 месяц",
    description: "Длинные практики и расширенные возможности.",
    priceRub: 199,
    days: 30,
  },
  {
    sku: "premium_year",
    title: "Mind Minute Premium — 1 год",
    description: "Длинные практики и расширенные возможности.",
    priceRub: 1490,
    days: 365,
  },
];

export function isPremiumDuration(durationSec: number) {
  return durationSec > PREMIUM_FREE_MAX_SEC;
}

export function formatPriceRub(priceRub: number) {
  return `${priceRub} ₽`;
}

