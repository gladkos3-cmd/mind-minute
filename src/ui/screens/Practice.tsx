import { useEffect, useRef, useState } from "react";
import type { BreathPhase, PracticeDefinition } from "../../content/practices";
import { startSound, stopSound } from "../../lib/audio";
import { hapticLight } from "../../lib/telegram";

export function Practice(props: {
  practice: PracticeDefinition;
  durationSec: number;
  before?: number;
  onCancel: () => void;
  onDone: (args: { after: number }) => void;
}) {
  const { practice, durationSec, onCancel, onDone } = props;
  const [t, setT] = useState(durationSec);
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [after, setAfter] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const started = useRef<number | null>(null);

  useEffect(() => {
    started.current = Date.now();
    const timer = window.setInterval(() => {
      setT((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const seq = practice.breath.map((s) => ({ p: s.phase, sec: s.sec }));
    let idx = 0;
    let left = seq[0].sec;
    setPhase(seq[0].p);

    const id = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        idx = (idx + 1) % seq.length;
        left = seq[idx].sec;
        setPhase(seq[idx].p);
        hapticLight();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [practice.breath]);

  useEffect(() => {
    if (!soundEnabled) {
      stopSound();
      return;
    }
    void startSound(practice.sound, volume);
    return () => stopSound();
  }, [practice.sound, soundEnabled, volume]);

  return (
    <div className="app">
      <header className="top">
        <button className="ghost" onClick={onCancel}>
          Назад
        </button>
        <div className="topCenter">
          <div className="brandTitle">{practice.title}</div>
          <div className="brandSub">{formatTime(t)}</div>
        </div>
        <div style={{ width: 64 }} />
      </header>

      <main className="content">
        <section className="card">
          <div className="muted">{practice.instruction}</div>
          <div className={`orb orb-${phase}`}>
            <div className="orbText">{labelPhase(phase)}</div>
          </div>
          <div className="muted mtSmall">Если хочется — просто наблюдай дыхание, без оценок.</div>
        </section>

        <section className="card">
          <div className="row">
            <div className="cardTitle" style={{ margin: 0 }}>
              Звук
            </div>
            <button
              className={`chip ${soundEnabled ? "chipActive" : ""}`}
              onClick={() => setSoundEnabled((v) => !v)}
            >
              {soundEnabled ? "Вкл" : "Выкл"}
            </button>
          </div>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            disabled={!soundEnabled}
          />
          <div className="muted">Громкость: {Math.round(volume * 100)}%</div>
        </section>

        {t === 0 ? (
          <section className="card">
            <div className="cardTitle">Как стало?</div>
            <div className="row">
              <div className="muted">Напряжение</div>
              <div className="muted">0–10</div>
            </div>
            <input
              className="range"
              type="range"
              min={0}
              max={10}
              value={after}
              onChange={(e) => setAfter(Number(e.target.value))}
            />
            <div className="row">
              <div className="pill">0 спокойно</div>
              <div className="pill">10 очень</div>
            </div>
            <button className="primary mt" onClick={() => onDone({ after })}>
              Сохранить
            </button>
          </section>
        ) : (
          <section className="card">
            <button className="primary" onClick={() => setT(0)}>
              Завершить раньше
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function labelPhase(p: BreathPhase) {
  switch (p) {
    case "inhale":
      return "Вдох";
    case "inhale2":
      return "Ещё вдох";
    case "hold":
      return "Пауза";
    case "exhale":
      return "Выдох";
  }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

