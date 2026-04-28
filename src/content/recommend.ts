import type { PracticeDefinition, PracticeMode } from "./practices";
import { PRACTICES } from "./practices";

export type RecommendContext = {
  mode: PracticeMode;
  before?: number; // 0..10
  now: Date;
};

function clamp0to10(v: number) {
  return Math.max(0, Math.min(10, v));
}

function isNight(now: Date) {
  const h = now.getHours();
  return h >= 22 || h <= 6;
}

function scorePractice(p: PracticeDefinition, ctx: RecommendContext): number {
  let score = 0;

  if (p.modes.includes(ctx.mode)) score += 50;

  const before = typeof ctx.before === "number" ? clamp0to10(ctx.before) : null;
  if (before !== null) {
    // High tension -> prioritize long-exhale and sigh.
    if (before >= 8) {
      if (p.tags.includes("sigh")) score += 25;
      if (p.tags.includes("long-exhale")) score += 18;
      if (p.tags.includes("box")) score -= 8; // box can feel "effortful" when panicky
    }
    // Low tension -> allow focus patterns.
    if (before <= 3) {
      if (p.groupId === "focus-reset") score += 8;
    }
  }

  if (ctx.mode === "sleep" || isNight(ctx.now)) {
    // Avoid strong holds at night for some users; prefer no-hold and long-exhale.
    if (p.tags.includes("no-hold")) score += 10;
    if (p.tags.includes("long-exhale")) score += 10;
    if (p.groupId === "sleep-downshift") score += 12;
  }

  if (ctx.mode === "focus") {
    if (p.groupId === "focus-reset") score += 12;
    if (p.tags.includes("box")) score += 8;
  }

  if (ctx.mode === "panic") {
    if (p.groupId === "panic-first-aid") score += 20;
    if (p.tags.includes("sigh")) score += 15;
    if (p.tags.includes("no-hold")) score += 8;
  }

  // Beginner friendly is a safe default.
  if (p.tags.includes("beginner")) score += 4;

  return score;
}

export function recommendPractices(ctx: RecommendContext, limit = 5): PracticeDefinition[] {
  const scored = PRACTICES.map((p) => ({ p, score: scorePractice(p, ctx) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);

  return scored.slice(0, limit);
}

export function listByGroup(): Record<string, PracticeDefinition[]> {
  const map: Record<string, PracticeDefinition[]> = {};
  for (const p of PRACTICES) {
    (map[p.groupId] ??= []).push(p);
  }
  return map;
}

