import React, { useMemo, useState } from "react";
import { PRACTICE_GROUPS } from "../../content/practices";
import { recommendPractices } from "../../content/recommend";
import type { PracticeMode } from "../../content/practices";
import type { SessionRecord } from "../../lib/storage";

const DURATIONS_BASE: Array<{ label: string; sec: number }> = [
  { label: "30 сек", sec: 30 },
  { label: "90 сек", sec: 90 },
  { label: "3 мин", sec: 180 },
];

const DURATION_FOCUS_6MIN = { label: "6 мин", sec: 360 } as const;
const DURATION_SLEEP_10MIN = { label: "10 мин", sec: 600 } as const;

const MODES: Array<{ id: PracticeMode; title: string; hint: string }> = [
  { id: "calm", title: "Успокоиться", hint: "снять напряжение" },
  { id: "focus", title: "Сфокусироваться", hint: "перед задачей/встречей" },
  { id: "sleep", title: "Заснуть", hint: "выдохнуть и отключиться" },
  { id: "panic", title: "Срочно", hint: "если накрывает" },
];

function clamp0to10(x: number) {
  return Math.max(0, Math.min(10, x));
}

export function Home(props: {
  isTelegram: boolean;
  streakCount: number;
  latestSessions: SessionRecord[];
  onStart: (args: { practiceId: string; durationSec: number; before?: number }) => void;
}) {
  const { streakCount, latestSessions, onStart } = props;
  const [beforeValue, setBeforeValue] = useState(7);
  const [selectedDuration, setSelectedDuration] = useState(90);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDurationSec, setCustomDurationSec] = useState(120);
  const [mode, setMode] = useState<PracticeMode>("calm");
  const durations = useMemo(() => {
    if (mode === "sleep") return [...DURATIONS_BASE, DURATION_SLEEP_10MIN];
    if (mode === "focus") return [...DURATIONS_BASE, DURATION_FOCUS_6MIN];
    return DURATIONS_BASE;
  }, [mode]);
  const recommended = useMemo(() => recommendPractices({ mode, before: beforeValue, now: new Date() }, 5), [mode, beforeValue]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">MM</div>
          <div className="brandText">
            <div className="brandTitle">Mind Minute</div>
            <div className="brandSub">микропрактики в моменте</div>
          </div>
        </div>
        <div className="streak" title="Серия дней">
          <div className="streakLabel">streak</div>
          <div className="streakValue">{streakCount}</div>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <div className="cardTitle">Как ты себя сейчас чувствуешь?</div>
          <div className="row">
            <div className="muted">Напряжение</div>
            <div className="muted">0–10</div>
          </div>
          <input
            className="range rangeStress"
            type="range"
            min={0}
            max={10}
            defaultValue={7}
            style={
              {
                "--stress": String(beforeValue / 10),
              } as React.CSSProperties
            }
            onChange={(e) => {
              setBeforeValue(clamp0to10(Number(e.target.value)));
            }}
          />
          <div className="row">
            <div className="pill">0 спокойно</div>
            <div className="pill">10 очень</div>
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Цель</div>
          <div className="grid2">
            {MODES.map((m) => (
              <button key={m.id} className={`mode ${m.id === mode ? "modeActive" : ""}`} onClick={() => setMode(m.id)} type="button">
                <div className="modeTitle">{m.title}</div>
                <div className="modeHint">{m.hint}</div>
              </button>
            ))}
          </div>

          <div className="cardTitle mt">Время</div>
          <div className="chipScroller">
            {durations.map((d) => (
              <button
                key={d.sec}
                className={`chip ${d.sec === selectedDuration ? "chipActive" : ""}`}
                onClick={() => {
                  setCustomOpen(false);
                  setSelectedDuration(d.sec);
                }}
                type="button"
              >
                {d.label}
              </button>
            ))}
            <button
              className={`chip ${customOpen ? "chipActive" : ""}`}
              onClick={() => {
                setCustomOpen((v) => !v);
                setSelectedDuration(customDurationSec);
              }}
              type="button"
            >
              Своё {formatDuration(customDurationSec)}
            </button>
          </div>
          {customOpen ? (
            <div className="timeCustom">
              <div className="timeCustomRow">
                <div className="timeInputWrap">
                  <div className="timeLabel">мин</div>
                  <input
                    className="timeInput"
                    type="number"
                    min={0}
                    max={60}
                    value={Math.floor(customDurationSec / 60)}
                    onChange={(e) => {
                      const m = clampInt(Number(e.target.value), 0, 60);
                      const s = customDurationSec % 60;
                      const sec = clampInt(m * 60 + s, 30, 1800);
                      setCustomDurationSec(sec);
                      setSelectedDuration(sec);
                    }}
                  />
                </div>
                <div className="timeInputWrap">
                  <div className="timeLabel">сек</div>
                  <input
                    className="timeInput"
                    type="number"
                    min={0}
                    max={59}
                    value={customDurationSec % 60}
                    onChange={(e) => {
                      const m = Math.floor(customDurationSec / 60);
                      const s = clampInt(Number(e.target.value), 0, 59);
                      const sec = clampInt(m * 60 + s, 30, 1800);
                      setCustomDurationSec(sec);
                      setSelectedDuration(sec);
                    }}
                  />
                </div>
                <button
                  className="chip"
                  type="button"
                  onClick={() => {
                    const sec = clampInt(customDurationSec - 30, 30, 1800);
                    setCustomDurationSec(sec);
                    setSelectedDuration(sec);
                  }}
                >
                  −30с
                </button>
                <button
                  className="chip"
                  type="button"
                  onClick={() => {
                    const sec = clampInt(customDurationSec + 30, 30, 1800);
                    setCustomDurationSec(sec);
                    setSelectedDuration(sec);
                  }}
                >
                  +30с
                </button>
              </div>
              <input
                className="range"
                type="range"
                min={30}
                max={1800}
                step={15}
                value={customDurationSec}
                onChange={(e) => {
                  const sec = clampInt(Number(e.target.value), 30, 1800);
                  setCustomDurationSec(sec);
                  setSelectedDuration(sec);
                }}
              />
              <div className="muted">От 30 секунд до 30 минут. Для практики возьмём ближайшую доступную длительность.</div>
            </div>
          ) : null}
          <div className="muted mtSmall">
            Мы подбираем практику под кейс, уровень напряжения и время суток.
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Рекомендуем сейчас</div>
          <div className="list">
            {recommended.map((p) => (
              <button
                key={p.id}
                className="listRow listRowBtn"
                onClick={() => onStart({ practiceId: p.id, durationSec: pickDuration(p.durationsSec, selectedDuration), before: beforeValue })}
              >
                <div className="listMain">
                  <div className="listTitle">
                    {coolName(p, mode)}
                    {breathDigits(p) ? ` (${breathDigits(p)})` : ""}
                  </div>
                  <div className="listSub">
                    {p.title} · {formatDuration(pickDuration(p.durationsSec, selectedDuration))}
                  </div>
                </div>
                <div className="delta">▶</div>
              </button>
            ))}
          </div>
        </section>

        {latestSessions.length > 0 ? (
          <section className="card">
            <div className="cardTitle">Последние</div>
            <div className="list">
              {latestSessions.map((s) => (
                <div key={s.id} className="listRow">
                  <div className="listMain">
                    <div className="listTitle">
                      {labelMode(s.mode)} · {formatDuration(s.durationSec)}
                    </div>
                    <div className="listSub">{new Date(s.startedAt).toLocaleString()}</div>
                  </div>
                  <div className="delta">{formatDelta(s.before, s.after)}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
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

function formatDelta(before?: number, after?: number) {
  if (typeof before !== "number" || typeof after !== "number") return "";
  const d = after - before;
  if (d === 0) return "0";
  return d > 0 ? `+${d}` : String(d);
}

function formatDuration(durationSec: number) {
  if (durationSec < 120) return `${durationSec} сек`;
  const min = Math.round(durationSec / 60);
  return `${min} мин`;
}

function clampInt(x: number, min: number, max: number) {
  if (!Number.isFinite(x)) return min;
  const v = Math.round(x);
  return Math.max(min, Math.min(max, v));
}

function groupTitle(groupId: string) {
  return PRACTICE_GROUPS.find((g) => g.id === groupId)?.title ?? "Практика";
}

function pickDuration(allowed: number[], preferred: number) {
  if (allowed.includes(preferred)) return preferred;
  // choose closest
  let best = allowed[0] ?? preferred;
  let bestD = Math.abs(best - preferred);
  for (const a of allowed) {
    const d = Math.abs(a - preferred);
    if (d < bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

function shortTitle(title: string) {
  const t = title.replace(/^Сон:\s*/i, "").replace(/^Срочно:\s*/i, "");
  return t.length > 22 ? `${t.slice(0, 22)}…` : t;
}

function coolName(p: { groupId: string; tags: string[]; id: string }, mode: PracticeMode) {
  const group = groupTitle(p.groupId);

  if (mode === "panic") {
    if (p.tags.includes("sigh") || p.id.includes("sigh")) return "Снять волну тревоги";
    return "Быстро стабилизироваться";
  }
  if (mode === "sleep") {
    if (p.tags.includes("no-hold")) return "Мягко выключиться";
    return "Снижение оборотов";
  }
  if (mode === "focus") {
    if (p.tags.includes("box")) return "Собрать фокус";
    return "Ровный перезапуск";
  }
  // calm
  if (p.tags.includes("long-exhale")) return "Сброс напряжения";
  return `Лёгкий ${group.toLowerCase()}`;
}

function breathDigits(p: { breath: Array<{ phase: string; sec: number }> }) {
  // Show as (inhale–hold–exhale) in seconds; special-case inhale2: "2+1–6"
  const inhale = p.breath.find((s) => s.phase === "inhale")?.sec;
  const inhale2 = p.breath.find((s) => s.phase === "inhale2")?.sec;
  const holdSteps = p.breath.filter((s) => s.phase === "hold");
  const exhale = p.breath.find((s) => s.phase === "exhale")?.sec;

  if (typeof inhale !== "number" || typeof exhale !== "number") return "";
  const holdTotal = holdSteps.reduce((a, s) => a + (typeof s.sec === "number" ? s.sec : 0), 0);

  const inhaleStr = typeof inhale2 === "number" ? `${inhale}+${inhale2}` : String(inhale);
  if (holdTotal > 0) return `${inhaleStr}–${holdTotal}–${exhale}`;
  return `${inhaleStr}–${exhale}`;
}

