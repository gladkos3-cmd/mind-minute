export type PracticeMode = "calm" | "focus" | "sleep" | "panic";
export type BreathPhase = "inhale" | "hold" | "exhale" | "inhale2";

export type BreathStep = {
  phase: BreathPhase;
  sec: number;
  label?: string;
};

export type SoundProfile =
  | { kind: "none" }
  | { kind: "pinkNoise"; intensity?: number }
  | { kind: "ocean"; intensity?: number }
  | { kind: "rain"; intensity?: number }
  | { kind: "wind"; intensity?: number }
  | { kind: "forest"; intensity?: number }
  | { kind: "birds"; intensity?: number }
  | { kind: "stream"; intensity?: number }
  | { kind: "fire"; intensity?: number }
  | { kind: "space"; intensity?: number }
  | { kind: "whiteNoise"; intensity?: number }
  | { kind: "tone"; frequencyHz: number; wave?: OscillatorType };

export type PracticeGroupId =
  | "quick-calm"
  | "panic-first-aid"
  | "focus-reset"
  | "sleep-downshift"
  | "energy-light"
  | "body-release";

export type PracticeDefinition = {
  id: string;
  title: string;
  groupId: PracticeGroupId;
  modes: PracticeMode[];
  durationsSec: number[]; // allowed preset durations
  breath: BreathStep[];
  instruction: string;
  sound: SoundProfile;
  tags: Array<"beginner" | "silent-friendly" | "no-hold" | "long-exhale" | "box" | "sigh">;
};

export const PRACTICE_GROUPS: Array<{ id: PracticeGroupId; title: string; hint: string }> = [
  { id: "panic-first-aid", title: "Первая помощь", hint: "когда накрывает" },
  { id: "quick-calm", title: "Быстро успокоиться", hint: "снять напряжение" },
  { id: "focus-reset", title: "Фокус", hint: "перезапуск внимания" },
  { id: "sleep-downshift", title: "Сон", hint: "снижаем обороты" },
  { id: "body-release", title: "Тело", hint: "снять зажимы" },
  { id: "energy-light", title: "Лёгкая энергия", hint: "мягко взбодриться" },
];

export const PRACTICES: PracticeDefinition[] = [
  {
    id: "panic-sigh-physio",
    title: "Срочно: двойной вдох + длинный выдох",
    groupId: "panic-first-aid",
    modes: ["panic", "calm"],
    durationsSec: [30, 60, 90],
    breath: [
      { phase: "inhale", sec: 2, label: "вдох" },
      { phase: "inhale2", sec: 1, label: "добавь ещё чуть-чуть" },
      { phase: "exhale", sec: 6, label: "медленный выдох" },
    ],
    instruction: "Если тревожно: делай два вдоха (второй короткий) и длинный выдох. Просто следуй ритму.",
    sound: { kind: "pinkNoise", intensity: 0.7 },
    tags: ["beginner", "silent-friendly", "sigh", "long-exhale"],
  },
  {
    id: "calm-extended-exhale-426",
    title: "Выдох длиннее (4–2–6)",
    groupId: "quick-calm",
    modes: ["calm", "panic"],
    durationsSec: [60, 90, 180],
    breath: [
      { phase: "inhale", sec: 4 },
      { phase: "hold", sec: 2 },
      { phase: "exhale", sec: 6 },
    ],
    instruction: "Выдох чуть длиннее вдоха помогает мягко снизить напряжение. Без усилий, просто ритм.",
    sound: { kind: "ocean", intensity: 0.55 },
    tags: ["beginner", "silent-friendly", "long-exhale"],
  },
  {
    id: "calm-nohold-406",
    title: "Тихое дыхание (4–0–6)",
    groupId: "quick-calm",
    modes: ["calm", "sleep"],
    durationsSec: [60, 90, 180],
    breath: [
      { phase: "inhale", sec: 4 },
      { phase: "exhale", sec: 6 },
    ],
    instruction: "Без пауз. Вдох спокойный, выдох длиннее. Отлично, когда паузы раздражают или бодрят.",
    sound: { kind: "rain", intensity: 0.6 },
    tags: ["beginner", "silent-friendly", "no-hold", "long-exhale"],
  },
  {
    id: "focus-box-4444",
    title: "Box breathing (4–4–4–4)",
    groupId: "focus-reset",
    modes: ["focus"],
    durationsSec: [60, 90, 180, 360],
    breath: [
      { phase: "inhale", sec: 4 },
      { phase: "hold", sec: 4 },
      { phase: "exhale", sec: 4 },
      { phase: "hold", sec: 4, label: "пауза" },
    ],
    instruction: "Ровный квадрат выравнивает ритм. Дыши тихо, будто никого не беспокоишь.",
    sound: { kind: "tone", frequencyHz: 196, wave: "sine" },
    tags: ["beginner", "box"],
  },
  {
    id: "focus-resonance-505",
    title: "Ровный ритм (5–0–5)",
    groupId: "focus-reset",
    modes: ["focus", "calm"],
    durationsSec: [90, 180, 360],
    breath: [
      { phase: "inhale", sec: 5 },
      { phase: "exhale", sec: 5 },
    ],
    instruction: "Ровный медленный ритм помогает стабилизировать внимание. Просто держи темп.",
    sound: { kind: "pinkNoise", intensity: 0.45 },
    tags: ["beginner", "silent-friendly", "no-hold"],
  },
  {
    id: "sleep-478",
    title: "Сон: 4–7–8 (мягко)",
    groupId: "sleep-downshift",
    modes: ["sleep", "calm"],
    durationsSec: [90, 180, 600],
    breath: [
      { phase: "inhale", sec: 4 },
      { phase: "hold", sec: 7 },
      { phase: "exhale", sec: 8 },
    ],
    instruction: "Если пауза комфортна: удержание и длинный выдох помогают «сбросить обороты». Без напряжения.",
    sound: { kind: "ocean", intensity: 0.4 },
    tags: ["long-exhale"],
  },
  {
    id: "sleep-368",
    title: "Сон: 3–0–6 (очень мягко)",
    groupId: "sleep-downshift",
    modes: ["sleep"],
    durationsSec: [60, 90, 180, 600],
    breath: [
      { phase: "inhale", sec: 3 },
      { phase: "exhale", sec: 6 },
    ],
    instruction: "Самый мягкий вариант: короткий вдох и длинный выдох. Подходит, если не хочется считать паузы.",
    sound: { kind: "rain", intensity: 0.5 },
    tags: ["beginner", "no-hold", "long-exhale", "silent-friendly"],
  },
  {
    id: "body-3-shoulders",
    title: "Тело: выдох + расслабление плеч",
    groupId: "body-release",
    modes: ["calm", "focus"],
    durationsSec: [60, 90],
    breath: [
      { phase: "inhale", sec: 3, label: "вдох (плечи вверх чуть-чуть)" },
      { phase: "exhale", sec: 6, label: "выдох (плечи вниз)" },
    ],
    instruction: "На вдохе слегка приподними плечи, на выдохе отпусти вниз. Без боли и без рывков.",
    sound: { kind: "ocean", intensity: 0.35 },
    tags: ["beginner", "no-hold", "long-exhale"],
  },
  {
    id: "energy-2226",
    title: "Лёгкая энергия (2–2–2–6)",
    groupId: "energy-light",
    modes: ["focus"],
    durationsSec: [60, 90, 360],
    breath: [
      { phase: "inhale", sec: 2 },
      { phase: "hold", sec: 2 },
      { phase: "exhale", sec: 2 },
      { phase: "hold", sec: 6, label: "пауза после выдоха" },
    ],
    instruction:
      "Короткие фазы + длинная пауза после выдоха дают ощущение «собранности». Если неприятно — переключись на 5–0–5.",
    sound: { kind: "tone", frequencyHz: 220, wave: "triangle" },
    tags: ["box"],
  },
];

export function getPracticeById(id: string): PracticeDefinition | null {
  return PRACTICES.find((p) => p.id === id) ?? null;
}

