import type { SoundProfile } from "../content/practices";

type Playing = {
  ctx: AudioContext;
  master: GainNode;
  stop: () => void;
};

let current: Playing | null = null;
let playSeq = 0;

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

  const seq = ++playSeq;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

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
      void ctx.close();
    } catch {
      // ignore
    }
    return;
  }

  const v = Math.max(0, Math.min(1, volume01));
  const intensity = "intensity" in profile && typeof profile.intensity === "number" ? profile.intensity : 0.5;

  const makeNoise = () => createLoopingNoise(ctx);

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

