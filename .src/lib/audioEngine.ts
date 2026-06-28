// Web Audio synthesis engine — generates ambient sounds and tones in-browser.
// No external audio files required.
//
// v2: richer textures — multi-layered noise beds with independent slow LFOs,
// evolving filter sweeps, shared convolver reverb, and musical pad + arpeggio
// for frequency presets so they feel like meditation tracks instead of a
// single static sine.

import type { AmbientSound, FrequencyPreset } from "./sleepData";

let ctx: AudioContext | null = null;
let masterReverb: ConvolverNode | null = null;
let masterReverbGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ---------- Reverb (shared, lazy) ----------
function makeImpulseResponse(seconds: number, decay: number): AudioBuffer {
  const c = getCtx();
  const rate = c.sampleRate;
  const length = Math.floor(rate * seconds);
  const buf = c.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buf;
}

function getReverbBus(): GainNode {
  const c = getCtx();
  if (!masterReverb) {
    masterReverb = c.createConvolver();
    masterReverb.buffer = makeImpulseResponse(3.2, 2.4);
    masterReverbGain = c.createGain();
    masterReverbGain.gain.value = 1;
    masterReverb.connect(masterReverbGain).connect(c.destination);
  }
  return masterReverb as unknown as GainNode; // ConvolverNode accepts .connect input
}

// ---------- Noise ----------
function makeNoiseBuffer(type: "white" | "pink" | "brown"): AudioBuffer {
  const c = getCtx();
  const length = c.sampleRate * 6;
  const buf = c.createBuffer(1, length, c.sampleRate);
  const data = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

export interface PlayingHandle {
  stop: () => void;
  setVolume: (v: number) => void;
}

// ---------- Ambient ----------
export function playAmbient(sound: AmbientSound, volume = 0.5): PlayingHandle {
  const c = getCtx();
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);

  // Light reverb send for atmosphere
  const reverbSend = c.createGain();
  reverbSend.gain.value = volume * 0.25;
  master.connect(reverbSend);
  reverbSend.connect(getReverbBus());

  const stops: Array<() => void> = [];
  const volumeTargets: Array<(v: number) => void> = [
    (v) => master.gain.setTargetAtTime(v, c.currentTime, 0.08),
    (v) => reverbSend.gain.setTargetAtTime(v * 0.25, c.currentTime, 0.08),
  ];

  // Pure tone (singing bowl)
  if (sound.engine === "tone") {
    const base = sound.toneFreq ?? 256;
    // Layered partials with slow phasing
    const partials = [1, 2, 3, 4.2];
    const partialGains = [0.6, 0.3, 0.18, 0.1];
    partials.forEach((mult, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * mult;
      const g = c.createGain();
      g.gain.value = 0;
      // Slow attack swell
      g.gain.setTargetAtTime(partialGains[i], c.currentTime, 1.2 + i * 0.4);
      // Slow tremolo, different rate per partial
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.08 + i * 0.04;
      const lfoG = c.createGain();
      lfoG.gain.value = partialGains[i] * 0.35;
      lfo.connect(lfoG).connect(g.gain);
      osc.connect(g).connect(master);
      osc.start(); lfo.start();
      stops.push(() => { try { osc.stop(); lfo.stop(); } catch {} });
    });
    return {
      stop: () => { stops.forEach((s) => s()); master.disconnect(); reverbSend.disconnect(); },
      setVolume: (v) => volumeTargets.forEach((fn) => fn(v)),
    };
  }

  // Noise-based: build 2 layers — a "body" and a "shimmer" — with independent
  // slow LFOs and an evolving filter sweep so the texture breathes.
  const noiseType = sound.noiseType ?? "pink";
  const baseFreq = sound.filterFreq ?? 2000;
  const baseQ = sound.filterQ ?? 0.7;
  const lfoRate = sound.lfoRate ?? 0.2;
  const lfoDepth = sound.lfoDepth ?? 0.3;

  // Layer A — body
  const srcA = c.createBufferSource();
  srcA.buffer = makeNoiseBuffer(noiseType);
  srcA.loop = true;
  const filtA = c.createBiquadFilter();
  filtA.type = "lowpass";
  filtA.frequency.value = baseFreq;
  filtA.Q.value = baseQ;
  const gainA = c.createGain();
  gainA.gain.value = 0.7;
  srcA.connect(filtA).connect(gainA).connect(master);

  // Slow swell LFO on filter cutoff for movement
  const swellA = c.createOscillator();
  swellA.frequency.value = 0.05 + Math.random() * 0.06;
  const swellAG = c.createGain();
  swellAG.gain.value = baseFreq * 0.45;
  swellA.connect(swellAG).connect(filtA.frequency);

  // Amplitude tremolo (the sound's character LFO)
  const ampA = c.createOscillator();
  ampA.frequency.value = lfoRate;
  const ampAG = c.createGain();
  ampAG.gain.value = lfoDepth * 0.7;
  ampA.connect(ampAG).connect(gainA.gain);

  // Layer B — shimmer (brighter, quieter, slower opposing motion)
  const srcB = c.createBufferSource();
  srcB.buffer = makeNoiseBuffer(noiseType === "brown" ? "pink" : noiseType);
  srcB.loop = true;
  const filtB = c.createBiquadFilter();
  filtB.type = "bandpass";
  filtB.frequency.value = baseFreq * 2.2;
  filtB.Q.value = Math.max(1, baseQ);
  const gainB = c.createGain();
  gainB.gain.value = 0.25;
  srcB.connect(filtB).connect(gainB).connect(master);

  const swellB = c.createOscillator();
  swellB.frequency.value = 0.03 + Math.random() * 0.05;
  const swellBG = c.createGain();
  swellBG.gain.value = baseFreq * 0.6;
  swellB.connect(swellBG).connect(filtB.frequency);

  const ampB = c.createOscillator();
  ampB.frequency.value = lfoRate * 0.6 + 0.05;
  const ampBG = c.createGain();
  ampBG.gain.value = 0.18;
  ampB.connect(ampBG).connect(gainB.gain);

  srcA.start(); srcB.start();
  swellA.start(); swellB.start();
  ampA.start(); ampB.start();

  stops.push(() => {
    try {
      srcA.stop(); srcB.stop();
      swellA.stop(); swellB.stop();
      ampA.stop(); ampB.stop();
    } catch {}
  });

  return {
    stop: () => { stops.forEach((s) => s()); master.disconnect(); reverbSend.disconnect(); },
    setVolume: (v) => volumeTargets.forEach((fn) => fn(v)),
  };
}

// ---------- Frequency presets ----------
// Build a soft musical pad around the base frequency (root + fifth + octave),
// a slow filter sweep, and a gentle pentatonic arpeggio so the listener hears
// rhythm and flow instead of one flat tone. Binaural offset is preserved.
export function playFrequency(freq: FrequencyPreset, volume = 0.25): PlayingHandle {
  const c = getCtx();
  const master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);

  // Reverb send for depth
  const reverbSend = c.createGain();
  reverbSend.gain.value = volume * 0.5;
  master.connect(reverbSend);
  reverbSend.connect(getReverbBus());

  const stops: Array<() => void> = [];
  const padFilter = c.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = freq.hz * 4;
  padFilter.Q.value = 1;
  padFilter.connect(master);

  // Slow filter sweep for evolving timbre
  const sweep = c.createOscillator();
  sweep.frequency.value = 0.04;
  const sweepG = c.createGain();
  sweepG.gain.value = freq.hz * 2;
  sweep.connect(sweepG).connect(padFilter.frequency);
  sweep.start();
  stops.push(() => { try { sweep.stop(); } catch {} });

  // --- Binaural carrier (left = base, right = base + offset) ---
  const merger = c.createChannelMerger(2);
  const carrierL = c.createOscillator();
  carrierL.type = "sine";
  carrierL.frequency.value = freq.hz;
  const cLG = c.createGain(); cLG.gain.value = 0.35;
  carrierL.connect(cLG).connect(merger, 0, 0);

  const carrierR = c.createOscillator();
  carrierR.type = "sine";
  carrierR.frequency.value = freq.hz + (freq.binaural ?? 0);
  const cRG = c.createGain(); cRG.gain.value = 0.35;
  carrierR.connect(cRG).connect(merger, 0, 1);

  merger.connect(padFilter);
  carrierL.start(); carrierR.start();
  stops.push(() => { try { carrierL.stop(); carrierR.stop(); } catch {} });

  // --- Pad: fifth + octave with slow detune drift ---
  const padNotes = [freq.hz * 1.5, freq.hz * 2];
  padNotes.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.18 - i * 0.05, c.currentTime, 2);
    // Slow tremolo
    const tremo = c.createOscillator();
    tremo.frequency.value = 0.1 + i * 0.07;
    const tremoG = c.createGain();
    tremoG.gain.value = 0.06;
    tremo.connect(tremoG).connect(g.gain);
    // Detune drift
    const drift = c.createOscillator();
    drift.frequency.value = 0.07 + i * 0.03;
    const driftG = c.createGain();
    driftG.gain.value = 4; // cents
    drift.connect(driftG).connect(o.detune);
    o.connect(g).connect(padFilter);
    o.start(); tremo.start(); drift.start();
    stops.push(() => { try { o.stop(); tremo.stop(); drift.stop(); } catch {} });
  });

  // --- Gentle pentatonic arpeggio for rhythm/flow ---
  // Pentatonic intervals (semitones) above root: 0, 3, 5, 7, 10 (minor pentatonic)
  // Played 2 octaves up at a slow, breathing tempo.
  const semitone = (n: number) => freq.hz * 4 * Math.pow(2, n / 12);
  const scale = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3];
  let step = 0;
  const noteEvery = 1.6; // seconds — slow, dreamy
  const arpGain = c.createGain();
  arpGain.gain.value = 0.22;
  arpGain.connect(padFilter);

  const interval = window.setInterval(() => {
    const now = c.currentTime;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = semitone(scale[step % scale.length]);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + noteEvery * 0.95);
    o.connect(g).connect(arpGain);
    o.start(now);
    o.stop(now + noteEvery);
    step++;
  }, noteEvery * 1000);
  stops.push(() => clearInterval(interval));

  return {
    stop: () => { stops.forEach((s) => s()); master.disconnect(); reverbSend.disconnect(); },
    setVolume: (v) => {
      master.gain.setTargetAtTime(v, c.currentTime, 0.08);
      reverbSend.gain.setTargetAtTime(v * 0.5, c.currentTime, 0.08);
    },
  };
}
