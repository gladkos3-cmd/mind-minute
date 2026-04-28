import { useEffect, useMemo, useState } from "react";
import { initTelegram, hapticLight } from "../lib/telegram";
import { bumpStreakIfNeeded, loadState, saveState, type AppState, type SessionRecord } from "../lib/storage";
import { getPracticeById } from "../content/practices";
import { stopSound } from "../lib/audio";
import { Home } from "./screens/Home";
import { Practice } from "./screens/Practice";
import { Summary } from "./screens/Summary";

type Route =
  | { name: "home" }
  | { name: "practice"; payload: { practiceId: string; durationSec: number; before?: number } }
  | { name: "summary"; payload: { sessionId: string } };

export function App() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [state, setState] = useState<AppState>(() => loadState());
  const [route, setRoute] = useState<Route>({ name: "home" });

  useEffect(() => {
    const res = initTelegram();
    setIsTelegram(res.isTelegram);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentSession = useMemo(() => {
    if (route.name !== "summary") return null;
    return state.sessions.find((s) => s.id === route.payload.sessionId) ?? null;
  }, [route, state.sessions]);

  const currentPractice = useMemo(() => {
    if (route.name !== "practice") return null;
    return getPracticeById(route.payload.practiceId);
  }, [route]);

  if (route.name === "practice") {
    if (!currentPractice) {
      return (
        <Home
          isTelegram={isTelegram}
          streakCount={state.streak.count}
          latestSessions={state.sessions.slice(0, 5)}
          onStart={({ practiceId, durationSec, before }) => {
            hapticLight();
            setRoute({ name: "practice", payload: { practiceId, durationSec, before } });
          }}
        />
      );
    }
    return (
      <Practice
        practice={currentPractice}
        durationSec={route.payload.durationSec}
        before={route.payload.before}
        onCancel={() => {
          hapticLight();
          stopSound();
          setRoute({ name: "home" });
        }}
        onDone={({ after }) => {
          hapticLight();
          stopSound();
          const session: SessionRecord = {
            id: crypto.randomUUID(),
            startedAt: Date.now(),
            durationSec: route.payload.durationSec,
            mode: currentPractice.modes[0] ?? "calm",
            before: route.payload.before,
            after,
          };
          setState((prev) => bumpStreakIfNeeded({ ...prev, sessions: [session, ...prev.sessions].slice(0, 200) }));
          setRoute({ name: "summary", payload: { sessionId: session.id } });
        }}
      />
    );
  }

  if (route.name === "summary") {
    return (
      <Summary
        isTelegram={isTelegram}
        session={currentSession}
        streakCount={state.streak.count}
        onBack={() => {
          hapticLight();
          setRoute({ name: "home" });
        }}
      />
    );
  }

  return (
    <Home
      isTelegram={isTelegram}
      streakCount={state.streak.count}
      latestSessions={state.sessions.slice(0, 5)}
      onStart={({ practiceId, durationSec, before }) => {
        hapticLight();
        setRoute({ name: "practice", payload: { practiceId, durationSec, before } });
      }}
    />
  );
}

