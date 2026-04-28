import type { SessionRecord } from "../../lib/storage";

export function Summary(props: {
  isTelegram: boolean;
  session: SessionRecord | null;
  streakCount: number;
  onBack: () => void;
}) {
  const { isTelegram, session, streakCount, onBack } = props;

  if (!session) {
    return (
      <div className="app">
        <header className="top">
          <button className="ghost" onClick={onBack}>
            Назад
          </button>
          <div className="topCenter">
            <div className="brandTitle">Готово</div>
            <div className="brandSub">сессия не найдена</div>
          </div>
          <div style={{ width: 64 }} />
        </header>
      </div>
    );
  }

  const delta = typeof session.before === "number" && typeof session.after === "number" ? session.after - session.before : null;

  return (
    <div className="app">
      <header className="top">
        <button className="ghost" onClick={onBack}>
          На главную
        </button>
        <div className="topCenter">
          <div className="brandTitle">Готово</div>
          <div className="brandSub">streak {streakCount}</div>
        </div>
        <div style={{ width: 64 }} />
      </header>

      <main className="content">
        <section className="card">
          <div className="cardTitle">{labelMode(session.mode)}</div>
          <div className="muted">
            Длительность: {formatDuration(session.durationSec)} · {new Date(session.startedAt).toLocaleString()}
          </div>

          <div className="kpis mt">
            <div className="kpi">
              <div className="kpiLabel">до</div>
              <div className="kpiValue">{formatNum(session.before)}</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">после</div>
              <div className="kpiValue">{formatNum(session.after)}</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">дельта</div>
              <div className="kpiValue">{delta === null ? "—" : delta > 0 ? `+${delta}` : String(delta)}</div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Следующий шаг</div>
          <div className="muted">Сделай один маленький выбор: вода / 1 задача / лечь в кровать.</div>
          <div className="row mt">
            <button className="chip chipActive" onClick={onBack}>
              Ещё раз
            </button>
            <a className="chip" href="https://t.me/" target="_blank" rel="noreferrer">
              Открыть Telegram
            </a>
          </div>
          <div className="muted mtSmall">
            {isTelegram ? "Запущено внутри Telegram Mini App." : "Сейчас это браузерный режим. В Telegram будет полноценный UX."}
          </div>
        </section>
      </main>
    </div>
  );
}

function labelMode(m: SessionRecord["mode"]) {
  switch (m) {
    case "calm":
      return "Успокоиться";
    case "focus":
      return "Фокус";
    case "sleep":
      return "Сон";
    case "panic":
      return "Срочно";
  }
}

function formatNum(v?: number) {
  return typeof v === "number" ? String(v) : "—";
}

function formatDuration(durationSec: number) {
  if (durationSec < 120) return `${durationSec} сек`;
  return `${Math.round(durationSec / 60)} мин`;
}

