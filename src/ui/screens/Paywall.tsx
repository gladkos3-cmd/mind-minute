import React, { useEffect, useMemo, useState } from "react";
import { apiPost } from "../../lib/api";
import { openTelegramInvoice } from "../../lib/telegram";
import { formatPriceRub, PREMIUM_PRODUCTS, type PremiumSku } from "../../lib/premium";
import { track } from "../../lib/track";

export function Paywall(props: {
  onClose: () => void;
  onPurchased: () => void;
}) {
  const { onClose, onPurchased } = props;
  const [loadingSku, setLoadingSku] = useState<PremiumSku | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    track("paywall_view");
  }, []);

  const items = useMemo(() => PREMIUM_PRODUCTS, []);

  async function buy(sku: PremiumSku) {
    setErr(null);
    setLoadingSku(sku);
    try {
      track("checkout_start", { sku });
      const { invoiceLink } = await apiPost<{ invoiceLink: string }>("/api/checkout", { sku });
      const status = await openTelegramInvoice(invoiceLink);
      if (status === "paid") {
        track("payment_success", { sku });
        onPurchased();
      } else if (status === "cancelled") {
        track("payment_cancel", { sku });
      } else {
        track("payment_fail", { sku, status });
        setErr("Не удалось оплатить. Попробуй ещё раз.");
      }
    } catch {
      track("payment_fail", { sku, stage: "checkout" });
      setErr("Платёж сейчас недоступен. Проверь позже.");
    } finally {
      setLoadingSku(null);
    }
  }

  return (
    <div className="app">
      <header className="top">
        <button className="ghost" onClick={onClose} type="button">
          Назад
        </button>
        <div className="topCenter">
          <div className="brandTitle">Premium</div>
          <div className="brandSub">длинные практики</div>
        </div>
        <div style={{ width: 64 }} />
      </header>

      <main className="content">
        <section className="card">
          <div className="cardTitle">Что откроется</div>
          <div className="muted">
            - Практики на 6–30 минут
            <br />- Больше спокойных сессий для сна и фокуса
            <br />- Поддержка проекта
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Тариф</div>
          <div className="list">
            {items.map((p) => (
              <button key={p.sku} className="primary" type="button" onClick={() => buy(p.sku)} disabled={loadingSku !== null}>
                {p.title} · {formatPriceRub(p.priceRub)}
              </button>
            ))}
          </div>
          {err ? <div className="muted mtSmall">{err}</div> : null}
        </section>
      </main>
    </div>
  );
}

