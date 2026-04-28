import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BreathPhase, PracticeDefinition } from "../../content/practices";
import { playBreathCue, playChime, startSound, stopSound } from "../../lib/audio";
import { hapticLight } from "../../lib/telegram";

type SoundChoiceId =
  | "off"
  | "ocean"
  | "rain"
  | "wind"
  | "forest"
  | "birds"
  | "stream"
  | "fire"
  | "space"
  | "pink"
  | "white"
  | "tone";

const SOUND_KEY = "mind-minute:soundChoice:v1";

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
  const [volume, setVolume] = useState(0.6);
  const [soundChoice, setSoundChoice] = useState<SoundChoiceId>(() => {
    const raw = localStorage.getItem(SOUND_KEY);
    if (!raw) return "ocean";
    return (raw as SoundChoiceId) ?? "ocean";
  });
  const started = useRef<number | null>(null);
  const lastCuePhase = useRef<BreathPhase | null>(null);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, soundChoice);
  }, [soundChoice]);

  useEffect(() => {
    started.current = Date.now();
    void playChime("start");
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
    if (t === 0) return;

    // Cue only when phase actually changes (avoid repeats).
    if (lastCuePhase.current === phase) return;
    lastCuePhase.current = phase;

    if (phase === "inhale" || phase === "inhale2") playBreathCue("inhale");
    if (phase === "exhale") playBreathCue("exhale");
  }, [phase, t]);

  const selectedSoundProfile = useMemo(() => {
    switch (soundChoice) {
      case "off":
        return { kind: "none" } as const;
      case "ocean":
        return { kind: "ocean", intensity: 0.55 } as const;
      case "rain":
        return { kind: "rain", intensity: 0.6 } as const;
      case "wind":
        return { kind: "wind", intensity: 0.6 } as const;
      case "forest":
        return { kind: "forest", intensity: 0.55 } as const;
      case "birds":
        return { kind: "birds", intensity: 0.55 } as const;
      case "stream":
        return { kind: "stream", intensity: 0.55 } as const;
      case "fire":
        return { kind: "fire", intensity: 0.55 } as const;
      case "space":
        return { kind: "space", intensity: 0.55 } as const;
      case "pink":
        return { kind: "pinkNoise", intensity: 0.55 } as const;
      case "white":
        return { kind: "whiteNoise", intensity: 0.55 } as const;
      case "tone":
        return { kind: "tone", frequencyHz: 196, wave: "sine" } as const;
    }
  }, [soundChoice]);

  useEffect(() => {
    if (selectedSoundProfile.kind === "none") {
      stopSound();
      return;
    }
    void startSound(selectedSoundProfile, volume);
    return () => stopSound();
  }, [selectedSoundProfile, volume]);

  useEffect(() => {
    if (t === 0) {
      stopSound();
      void playChime("end");
    }
  }, [t]);

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
          <div className="practiceInstruction">{practice.instruction}</div>
          <div className={`orb orb-${phase}`}>
            <div className="orbMeditator" aria-hidden="true">
              <IconMeditator className="orbMeditatorIcon" />
            </div>
            <div className="orbText">{labelPhase(phase)}</div>
          </div>
          <div className="practiceNote mtSmall">Если хочется — просто наблюдай дыхание, без оценок.</div>
        </section>

        <section className="card">
          <div className="row">
            <div className="cardTitle" style={{ margin: 0 }}>
              Звук
            </div>
            <button className={`chip ${soundChoice !== "off" ? "chipActive" : ""}`} onClick={() => setSoundChoice("off")}>
              Выкл
            </button>
          </div>
          <div className="soundGrid">
            <SoundButton id="ocean" activeId={soundChoice} onPick={setSoundChoice} label="Море" icon={IconWave} />
            <SoundButton id="rain" activeId={soundChoice} onPick={setSoundChoice} label="Дождь" icon={IconRain} />
            <SoundButton id="wind" activeId={soundChoice} onPick={setSoundChoice} label="Ветер" icon={IconWind} />
            <SoundButton id="forest" activeId={soundChoice} onPick={setSoundChoice} label="Лес" icon={IconForest} />
            <SoundButton id="birds" activeId={soundChoice} onPick={setSoundChoice} label="Птицы" icon={IconBird} />
            <SoundButton id="stream" activeId={soundChoice} onPick={setSoundChoice} label="Ручей" icon={IconStream} />
            <SoundButton id="fire" activeId={soundChoice} onPick={setSoundChoice} label="Огонь" icon={IconFire} />
            <SoundButton id="space" activeId={soundChoice} onPick={setSoundChoice} label="Космос" icon={IconSpace} />
            <SoundButton id="pink" activeId={soundChoice} onPick={setSoundChoice} label="Розовый" icon={IconNoise} />
            <SoundButton id="white" activeId={soundChoice} onPick={setSoundChoice} label="Белый" icon={IconNoise} />
          </div>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            disabled={soundChoice === "off"}
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
            <button
              className="primary"
              onClick={() => {
                stopSound();
                setT(0);
              }}
            >
              Завершить раньше
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function SoundButton(props: {
  id: SoundChoiceId;
  activeId: SoundChoiceId;
  onPick: (id: SoundChoiceId) => void;
  label: string;
  icon: React.FC<{ className?: string }>;
}) {
  const Icon = props.icon;
  return (
    <button
      className={`soundBtn ${props.id === props.activeId ? "soundBtnActive" : ""}`}
      onClick={() => props.onPick(props.id)}
      type="button"
    >
      <Icon className="soundIcon" />
      {props.label}
    </button>
  );
}

function IconWave(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 10c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".75"
      />
    </svg>
  );
}

function IconRain(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 10a5 5 0 0 1 9.6-1.7A3.8 3.8 0 1 1 17 18H8a4 4 0 0 1-1-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9 20l-1 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 20l-1 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 20l-1 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconWind(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path d="M3 9h12c2 0 3-1 3-2.5S16.9 4 15 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 13h15c2.2 0 3 1 3 2.3S19.9 18 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
      <path d="M3 17h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

function IconForest(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l5 7h-3l4 6h-5v5H11v-5H6l4-6H7l5-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconBird(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path d="M4 13c4-3 7-3 10 0 2 2 4 2 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 10c3-2 5-2 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

function IconStream(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path d="M7 4c2 3-2 5 0 8s-2 5 0 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4c2 3-2 5 0 8s-2 5 0 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
      <path d="M17 4c2 3-2 5 0 8s-2 5 0 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

function IconFire(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c2 4-2 5 1 9 2 2 2 7-1 9-3-2-6-6-3-11 1-2 2-3 3-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpace(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity=".75" />
    </svg>
  );
}

function IconNoise(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path d="M5 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 18V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
      <path d="M13 15V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".8" />
      <path d="M17 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
      <path d="M21 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

function IconMeditator(p: { className?: string }) {
  return (
    <svg className={p.className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 6.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7.2 11.2c1.2-1.9 2.7-2.9 4.8-2.9s3.6 1 4.8 2.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.2 18.6c1.6-1.6 3.6-2.4 5.8-2.4s4.2.8 5.8 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".85"
      />
      <path
        d="M9.1 13.1c-.9 1.1-1.4 2.3-1.6 3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".75"
      />
      <path
        d="M14.9 13.1c.9 1.1 1.4 2.3 1.6 3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".75"
      />
    </svg>
  );
}

function labelPhase(p: BreathPhase) {
  switch (p) {
    case "inhale":
      return "Вдыхаем";
    case "inhale2":
      return "Ещё вдох";
    case "hold":
      return "Пауза";
    case "exhale":
      return "Выдыхаем";
  }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}


