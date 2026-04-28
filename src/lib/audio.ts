import type { SoundProfile } from "../content/practices";

type Playing = {
  ctx: AudioContext;
  master: GainNode;
  stop: () => void;
};

let current: Playing | null = null;

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

export function stopSound() {
  if (!current) return;
  const prev = current;
  current = null;
  try {
    fade(prev.master, 0, 250);
    window.setTimeout(() => {
      try {
        prev.stop();
        void prev.ctx.close();
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

  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Some browsers require user gesture; we try to resume.
  try {
    await ctx.resume();
  } catch {
    // ignore
  }

  const v = Math.max(0, Math.min(1, volume01));
  const intensity = "intensity" in profile && typeof profile.intensity === "number" ? profile.intensity : 0.5;

  const nodesToStop: Array<{ stop?: () => void; disconnect?: () => void }> = [];

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
    const src = createLoopingNoise(ctx);
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
    const src = createLoopingNoise(ctx);
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
    const noise = createLoopingNoise(ctx);
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

  fade(master, 1, 400);

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
}

