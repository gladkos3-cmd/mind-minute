import type { SoundProfile } from "../content/practices";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type Playing = {
  ctx: AudioContext;
  master: GainNode;
  stop: () => void;
};

let current: Playing | null = null;
let playSeq = 0;
const bufferCache = new Map<string, Promise<AudioBuffer>>();
let sharedCtx: AudioContext | null = null;
let sharedOut: GainNode | null = null;

function createAudioContext(): AudioContext {
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  return new Ctx();
}

function getSharedAudio() {
  if (!sharedCtx) {
    sharedCtx = createAudioContext();
    sharedOut = sharedCtx.createGain();
    sharedOut.gain.value = 1;
    sharedOut.connect(sharedCtx.destination);
  }
  return { ctx: sharedCtx, out: sharedOut! };
}

export async function unlockAudio() {
  const { ctx, out } = getSharedAudio();
  try {
    await ctx.resume();
  } catch {
    // ignore
  }
  // iOS sometimes needs an actual sound scheduled from a gesture.
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    osc.frequency.value = 440;
    osc.connect(g).connect(out);
    const t = ctx.currentTime;
    osc.start(t);
    osc.stop(t + 0.02);
  } catch {
    // ignore
  }
}

function createNoiseBuffer(ctx: AudioContext, seconds: number) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function createLoopingNoise(ctx: AudioContext) {
  const src = ctx.createBufferSource();
  src.buffer = createNoiseBuffer(ctx, 2);
  src.loop = true;
  return src;
}

function fade(gain: GainNode, to: number, ms: number) {
  const t = gain.context.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(to, t + ms / 1000);
}

async function loadAudioBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return await cached;
  const p = (async () => {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    return await ctx.decodeAudioData(arr);
  })();
  bufferCache.set(url, p);
  return await p;
}

function mp3UrlFor(profile: SoundProfile): string | null {
  switch (profile.kind) {
    case "ocean":
      return "/sounds/ocean.mp3";
    case "rain":
      return "/sounds/rain.mp3";
    case "wind":
      return "/sounds/wind.mp3";
    case "forest":
      return "/sounds/forest.mp3";
    case "birds":
      return "/sounds/birds.mp3";
    case "stream":
      return "/sounds/stream.mp3";
    case "fire":
      return "/sounds/fire.mp3";
    case "space":
      return "/sounds/space.mp3";
    case "whiteNoise":
      return "/sounds/white.mp3";
    case "pinkNoise":
      return "/sounds/pink.mp3";
    default:
      return null;
  }
}

export function stopSound() {
  if (!current) return;
  const prev = current;
  current = null;
  try {
    fade(prev.master, 0, 250);
    window.setTimeout(() => {
      try {
        prev.stop();
        try {
          prev.master.disconnect();
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }, 300);
  } catch {
    // ignore
  }
}

export async function startSound(profile: SoundProfile, volume01: number) {
  stopSound();
  if (profile.kind === "none") return;

  const seq = ++playSeq;
  const { ctx, out } = getSharedAudio();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(out);

  const nodesToStop: Array<{ stop?: () => void; disconnect?: () => void }> = [];

  // Register as current immediately to avoid races during async resume.
  current = {
    ctx,
    master,
    stop: () => {
      for (const n of nodesToStop) {
        try {
          n.stop?.();
          n.disconnect?.();
        } catch {
          // ignore
        }
      }
    },
  };

  // Some browsers require user gesture; we try to resume.
  try {
    await ctx.resume();
  } catch {
    // ignore
  }

  // If something else started/stopped audio while we were resuming, abort.
  if (seq !== playSeq || current?.ctx !== ctx) {
    try {
      for (const n of nodesToStop) {
        n.stop?.();
        n.disconnect?.();
      }
    } catch {
      // ignore
    }
    return;
  }

  const v = Math.max(0, Math.min(1, volume01));
  const intensity = "intensity" in profile && typeof profile.intensity === "number" ? profile.intensity : 0.5;

  const makeNoise = () => createLoopingNoise(ctx);

  // Prefer real MP3 ambience loops when available.
  const url = mp3UrlFor(profile);
  if (url) {
    try {
      // iOS Safari can be picky about decodeAudioData() for some MP3 encodings.
      // Prefer an <audio> element routed into WebAudio when possible.
      const el = new Audio(url);
      el.loop = true;
      el.preload = "auto";
      try {
        (el as HTMLMediaElement).crossOrigin = "anonymous";
      } catch {
        // ignore
      }

      const media = ctx.createMediaElementSource(el);
      const g = ctx.createGain();
      g.gain.value = (0.18 + intensity * 0.22) * v;
      media.connect(g).connect(master);

      try {
        await el.play();
      } catch {
        // If autoplay is blocked, we'll fall back below.
        try {
          media.disconnect();
        } catch {
          // ignore
        }
        throw new Error("media-play-blocked");
      }

      nodesToStop.push({
        stop: () => {
          try {
            el.pause();
          } catch {
            // ignore
          }
        },
        disconnect: () => {
          try {
            media.disconnect();
          } catch {
            // ignore
          }
        },
      });
      fade(master, 1, 350);
      return;
    } catch {
      // Fall through to buffer decode / synth fallback.
    }

    try {
      const buffer = await loadAudioBuffer(ctx, url);
      if (seq !== playSeq || current?.ctx !== ctx) return;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const g = ctx.createGain();
      g.gain.value = (0.18 + intensity * 0.22) * v;

      src.connect(g).connect(master);
      src.start();
      nodesToStop.push({ stop: () => src.stop(), disconnect: () => src.disconnect() });
      fade(master, 1, 350);
      return;
    } catch {
      // fall back to synthesized implementations below
    }
  }

  if (profile.kind === "rain") {
    // Synth fallback (should rarely be used now).
  }

  if (profile.kind === "tone") {
    const osc = ctx.createOscillator();
    osc.type = profile.wave ?? "sine";
    osc.frequency.value = profile.frequencyHz;
    const g = ctx.createGain();
    g.gain.value = 0.06 * v;
    osc.connect(g).connect(master);
    osc.start();
    nodesToStop.push({ stop: () => osc.stop(), disconnect: () => osc.disconnect() });
  }

  if (profile.kind === "pinkNoise") {
    const src = makeNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900 + intensity * 800;
    const g = ctx.createGain();
    g.gain.value = (0.08 + intensity * 0.06) * v;
    src.connect(filter).connect(g).connect(master);
    src.start();
    nodesToStop.push({ stop: () => src.stop(), disconnect: () => src.disconnect() });
  }

  if (profile.kind === "rain") {
    const src = makeNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.value = (0.06 + intensity * 0.05) * v;
    src.connect(hp).connect(lp).connect(g).connect(master);
    src.start();
    nodesToStop.push({ stop: () => src.stop(), disconnect: () => src.disconnect() });
  }

  if (profile.kind === "ocean") {
    // Ocean = low noise swell + slow tremolo tone.
    const noise = makeNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const swell = ctx.createGain();
    swell.gain.value = (0.05 + intensity * 0.06) * v;
    noise.connect(lp).connect(swell).connect(master);
    noise.start();
    nodesToStop.push({ stop: () => noise.stop(), disconnect: () => noise.disconnect() });

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 110;
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 0.08;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.03 * v;
    const toneGain = ctx.createGain();
    toneGain.gain.value = 0.02 * v;
    trem.connect(tremGain).connect(toneGain.gain);
    osc.connect(toneGain).connect(master);
    osc.start();
    trem.start();
    nodesToStop.push(
      { stop: () => osc.stop(), disconnect: () => osc.disconnect() },
      { stop: () => trem.stop(), disconnect: () => trem.disconnect() },
    );
  }

  if (profile.kind === "whiteNoise") {
    const src = makeNoise();
    const g = ctx.createGain();
    g.gain.value = (0.05 + intensity * 0.07) * v;
    src.connect(g).connect(master);
    src.start();
    nodesToStop.push({ stop: () => src.stop(), disconnect: () => src.disconnect() });
  }

  if (profile.kind === "wind") {
    // Wind: band-passed noise with slow amplitude sway.
    const src = makeNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 220 + intensity * 180;
    bp.Q.value = 0.6;

    const sway = ctx.createOscillator();
    sway.type = "sine";
    sway.frequency.value = 0.08 + intensity * 0.08;
    const swayGain = ctx.createGain();
    swayGain.gain.value = 0.25;

    const g = ctx.createGain();
    g.gain.value = (0.04 + intensity * 0.06) * v;

    sway.connect(swayGain).connect(g.gain);
    src.connect(bp).connect(g).connect(master);
    src.start();
    sway.start();

    nodesToStop.push(
      { stop: () => src.stop(), disconnect: () => src.disconnect() },
      { stop: () => sway.stop(), disconnect: () => sway.disconnect() },
    );
  }

  if (profile.kind === "forest") {
    // Forest: low noise bed + gentle high shimmer.
    const low = makeNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    const lowGain = ctx.createGain();
    lowGain.gain.value = (0.03 + intensity * 0.05) * v;
    low.connect(lp).connect(lowGain).connect(master);
    low.start();

    const high = makeNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2400;
    const highGain = ctx.createGain();
    highGain.gain.value = (0.01 + intensity * 0.03) * v;
    high.connect(hp).connect(highGain).connect(master);
    high.start();

    nodesToStop.push(
      { stop: () => low.stop(), disconnect: () => low.disconnect() },
      { stop: () => high.stop(), disconnect: () => high.disconnect() },
    );
  }

  if (profile.kind === "stream") {
    // Stream: filtered noise with faster sparkle modulation.
    const src = makeNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600 + intensity * 800;
    bp.Q.value = 0.8;

    const sparkle = ctx.createOscillator();
    sparkle.type = "sine";
    sparkle.frequency.value = 2.2 + intensity * 1.2;
    const sparkleGain = ctx.createGain();
    sparkleGain.gain.value = 0.12;

    const g = ctx.createGain();
    g.gain.value = (0.03 + intensity * 0.05) * v;

    sparkle.connect(sparkleGain).connect(g.gain);
    src.connect(hp).connect(bp).connect(g).connect(master);
    src.start();
    sparkle.start();
    nodesToStop.push(
      { stop: () => src.stop(), disconnect: () => src.disconnect() },
      { stop: () => sparkle.stop(), disconnect: () => sparkle.disconnect() },
    );
  }

  if (profile.kind === "fire") {
    // Fire: warm crackle approximation (noise + lowpass + random-ish tremolo).
    const src = makeNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = (0.03 + intensity * 0.05) * v;

    const trem = ctx.createOscillator();
    trem.type = "square";
    trem.frequency.value = 18 + intensity * 12;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.02 + intensity * 0.02;
    trem.connect(tremGain).connect(g.gain);

    src.connect(lp).connect(g).connect(master);
    src.start();
    trem.start();

    nodesToStop.push(
      { stop: () => src.stop(), disconnect: () => src.disconnect() },
      { stop: () => trem.stop(), disconnect: () => trem.disconnect() },
    );
  }

  if (profile.kind === "birds") {
    // Birds: a few quiet chirp tones plus a soft noise bed.
    const bed = makeNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const bedGain = ctx.createGain();
    bedGain.gain.value = (0.005 + intensity * 0.02) * v;
    bed.connect(hp).connect(bedGain).connect(master);
    bed.start();
    nodesToStop.push({ stop: () => bed.stop(), disconnect: () => bed.disconnect() });

    const chirp = (baseHz: number, rate: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = baseHz;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g).connect(master);
      osc.start();

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = rate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.06 * v * (0.4 + intensity * 0.6);
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start();

      nodesToStop.push(
        { stop: () => osc.stop(), disconnect: () => osc.disconnect() },
        { stop: () => lfo.stop(), disconnect: () => lfo.disconnect() },
      );
    };

    chirp(1800, 0.6);
    chirp(2200, 0.9);
    chirp(2600, 0.5);
  }

  if (profile.kind === "space") {
    // Space: deep tone + very soft noise.
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 55;
    const g1 = ctx.createGain();
    g1.gain.value = (0.01 + intensity * 0.02) * v;
    osc.connect(g1).connect(master);
    osc.start();
    nodesToStop.push({ stop: () => osc.stop(), disconnect: () => osc.disconnect() });

    const src = makeNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const g2 = ctx.createGain();
    g2.gain.value = (0.01 + intensity * 0.03) * v;
    src.connect(lp).connect(g2).connect(master);
    src.start();
    nodesToStop.push({ stop: () => src.stop(), disconnect: () => src.disconnect() });
  }

  fade(master, 1, 400);
}

export async function playChime(which: "start" | "end") {
  const { ctx, out } = getSharedAudio();
  try {
    await ctx.resume();
  } catch {
    // ignore
  }
  const chimeOut = ctx.createGain();
  chimeOut.gain.value = 0.0001;
  chimeOut.connect(out);

  const now = ctx.currentTime;
  const base = which === "start" ? 523.25 : 440; // C5 vs A4
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(base, now);
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(base * 1.5, now);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  osc1.connect(g);
  osc2.connect(g);
  g.connect(chimeOut);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.0);
  osc2.stop(now + 1.0);

  window.setTimeout(() => {
    // shared context stays alive
  }, 1100);
}

export function playBreathCue(kind: "inhale" | "exhale") {
  const { ctx, out } = getSharedAudio();
  try {
    void ctx.resume();
  } catch {
    // ignore
  }
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);

  const base = kind === "inhale" ? 523.25 : 392.0; // C5 vs G4
  const end = kind === "inhale" ? 659.25 : 329.63; // E5 vs E4-ish
  const dur = 0.12;

  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(end, t + dur);

  g.gain.exponentialRampToValueAtTime(0.05, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

