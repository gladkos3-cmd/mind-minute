const KEY = "mind-minute:v1";

export type SessionRecord = {
  id: string;
  startedAt: number;
  durationSec: number;
  mode: "calm" | "focus" | "sleep" | "panic";
  before?: number; // 0..10
  after?: number; // 0..10
};

export type AppState = {
  streak: {
    count: number;
    lastDay: string | null; // YYYY-MM-DD in local time
  };
  sessions: SessionRecord[];
};

const DEFAULT_STATE: AppState = {
  streak: { count: 0, lastDay: null },
  sessions: [],
};

export function loadState(): AppState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== "object") return DEFAULT_STATE;
    if (!parsed.streak || !Array.isArray(parsed.sessions)) return DEFAULT_STATE;
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function bumpStreakIfNeeded(state: AppState): AppState {
  const today = todayLocalISO();
  const last = state.streak.lastDay;

  if (last === today) return state;

  // If last is yesterday, +1; else reset to 1.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
    yesterday.getDate(),
  ).padStart(2, "0")}`;

  const nextCount = last === y ? state.streak.count + 1 : 1;
  return { ...state, streak: { count: nextCount, lastDay: today } };
}

