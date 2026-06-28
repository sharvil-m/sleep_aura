// Sound and frequency catalogs for SleepAura.

export type SoundCategory = "nature" | "water" | "indoor" | "noise" | "atmos";

export interface AmbientSound {
  id: string;
  name: string;
  summary: string;
  emoji: string;
  category: SoundCategory;
  // synthesis recipe — interpreted by audio engine
  engine: "noise" | "tone" | "modNoise";
  noiseType?: "white" | "pink" | "brown";
  filterFreq?: number; // Hz lowpass
  filterQ?: number;
  lfoRate?: number; // Hz amplitude modulation
  lfoDepth?: number; // 0..1
  toneFreq?: number; // for tonal sounds
  free?: boolean;
}


export const AMBIENT_SOUNDS: AmbientSound[] = [
  // Free tier (5)
  { id: "rain", name: "Rainy Window", summary: "Soft drops on glass", emoji: "🌧️", category: "water", engine: "modNoise", noiseType: "pink", filterFreq: 1800, filterQ: 0.6, lfoRate: 0.7, lfoDepth: 0.15, free: true },
  { id: "ocean", name: "Ocean Waves", summary: "Endless tidal calm", emoji: "🌊", category: "water", engine: "modNoise", noiseType: "brown", filterFreq: 800, filterQ: 0.8, lfoRate: 0.12, lfoDepth: 0.6, free: true },
  { id: "fire", name: "Crackling Fire", summary: "Warm dancing embers", emoji: "🔥", category: "indoor", engine: "modNoise", noiseType: "pink", filterFreq: 2400, filterQ: 0.4, lfoRate: 4, lfoDepth: 0.35, free: true },
  { id: "crickets", name: "Night Crickets", summary: "Summer-night chorus", emoji: "🦗", category: "nature", engine: "modNoise", noiseType: "white", filterFreq: 5200, filterQ: 6, lfoRate: 8, lfoDepth: 0.6, free: true },
  { id: "pinkNoise", name: "Pink Noise", summary: "Balanced sonic blanket", emoji: "🎚️", category: "noise", engine: "noise", noiseType: "pink", filterFreq: 8000, free: true },
  { id: "forest", name: "Dawn Forest", summary: "Birds greeting the morning", emoji: "🌲", category: "nature", engine: "modNoise", noiseType: "white", filterFreq: 3800, filterQ: 4, lfoRate: 2.5, lfoDepth: 0.5 },
  { id: "wind", name: "Whispering Wind", summary: "Breeze through treetops", emoji: "🍃", category: "nature", engine: "modNoise", noiseType: "brown", filterFreq: 600, filterQ: 0.7, lfoRate: 0.3, lfoDepth: 0.5 },
  { id: "thunder", name: "Distant Thunder", summary: "Faraway rolling storm", emoji: "⛈️", category: "nature", engine: "modNoise", noiseType: "brown", filterFreq: 400, filterQ: 0.5, lfoRate: 0.15, lfoDepth: 0.7 },
  { id: "stream", name: "Mountain Stream", summary: "Bubbling alpine current", emoji: "🏞️", category: "water", engine: "modNoise", noiseType: "white", filterFreq: 3200, filterQ: 1.2, lfoRate: 1.6, lfoDepth: 0.3 },
  { id: "waterfall", name: "Steady Falls", summary: "Endless cascading rush", emoji: "💦", category: "water", engine: "noise", noiseType: "white", filterFreq: 2200 },
  { id: "drizzle", name: "Light Drizzle", summary: "Quiet misty rainfall", emoji: "🌦️", category: "water", engine: "modNoise", noiseType: "pink", filterFreq: 4200, filterQ: 0.8, lfoRate: 5, lfoDepth: 0.2 },
  { id: "pebbles", name: "Pebble Shore", summary: "Surf rolling over stones", emoji: "🪨", category: "water", engine: "modNoise", noiseType: "pink", filterFreq: 2600, filterQ: 1, lfoRate: 0.18, lfoDepth: 0.55 },
  { id: "river", name: "Lazy River", summary: "Slow meandering flow", emoji: "🌀", category: "water", engine: "modNoise", noiseType: "brown", filterFreq: 1200, filterQ: 0.6, lfoRate: 0.5, lfoDepth: 0.2 },
  { id: "coffee", name: "Cozy Café", summary: "Hum of a warm shop", emoji: "☕", category: "indoor", engine: "modNoise", noiseType: "pink", filterFreq: 1600, filterQ: 0.8, lfoRate: 1.2, lfoDepth: 0.25 },
  { id: "clock", name: "Ticking Clock", summary: "Steady metronome pulse", emoji: "⏰", category: "indoor", engine: "modNoise", noiseType: "white", filterFreq: 3000, filterQ: 8, lfoRate: 1, lfoDepth: 0.9 },
  { id: "library", name: "Quiet Library", summary: "Soft turning pages", emoji: "📖", category: "indoor", engine: "modNoise", noiseType: "pink", filterFreq: 2200, filterQ: 1, lfoRate: 0.4, lfoDepth: 0.4 },
  { id: "brownNoise", name: "Brown Noise", summary: "Deep grounding hum", emoji: "🟤", category: "noise", engine: "noise", noiseType: "brown", filterFreq: 2000 },
  { id: "bowl", name: "Singing Bowl", summary: "Resonant meditative tone", emoji: "🎵", category: "atmos", engine: "tone", toneFreq: 256 },
  { id: "arctic", name: "Arctic Wind", summary: "Icy howling gust", emoji: "🥶", category: "atmos", engine: "modNoise", noiseType: "white", filterFreq: 700, filterQ: 0.5, lfoRate: 0.25, lfoDepth: 0.6 },
  { id: "bamboo", name: "Bamboo Breeze", summary: "Rustling forest grove", emoji: "🎋", category: "atmos", engine: "modNoise", noiseType: "pink", filterFreq: 1400, filterQ: 1.2, lfoRate: 0.6, lfoDepth: 0.45 },
];

export interface FrequencyPreset {
  id: string;
  name: string;
  hz: number;
  band: "delta" | "theta" | "alpha" | "beta" | "solfeggio";
  description: string;
  free?: boolean;
  binaural?: number; // offset for right ear (binaural beat)
}

export const FREQUENCIES: FrequencyPreset[] = [
  // Free tier: 6 basics
  { id: "delta", name: "Delta 2 Hz", hz: 100, binaural: 2, band: "delta", description: "Deep sleep", free: true },
  { id: "theta", name: "Theta 6 Hz", hz: 200, binaural: 6, band: "theta", description: "Deep relaxation", free: true },
  { id: "alpha", name: "Alpha 10 Hz", hz: 220, binaural: 10, band: "alpha", description: "Calm focus", free: true },
  { id: "sol396", name: "396 Hz", hz: 396, band: "solfeggio", description: "Release fear", free: true },
  { id: "sol432", name: "432 Hz", hz: 432, band: "solfeggio", description: "Natural tuning", free: true },
  { id: "sol528", name: "528 Hz", hz: 528, band: "solfeggio", description: "Healing", free: true },
  // Logged-in extras
  { id: "beta", name: "Beta 18 Hz", hz: 240, binaural: 18, band: "beta", description: "Mental clarity" },
  { id: "sol174", name: "174 Hz", hz: 174, band: "solfeggio", description: "Pain relief" },
  { id: "sol285", name: "285 Hz", hz: 285, band: "solfeggio", description: "Tissue healing" },
  { id: "sol639", name: "639 Hz", hz: 639, band: "solfeggio", description: "Connection" },
  { id: "sol741", name: "741 Hz", hz: 741, band: "solfeggio", description: "Expression" },
  { id: "sol852", name: "852 Hz", hz: 852, band: "solfeggio", description: "Intuition" },
  { id: "sol963", name: "963 Hz", hz: 963, band: "solfeggio", description: "Higher awareness" },
];

export const MOODS = [
  { id: "happy", label: "Happy", emoji: "😊", color: "#fbbf24" },
  { id: "calm", label: "Calm", emoji: "😌", color: "#60a5fa" },
  { id: "neutral", label: "Neutral", emoji: "😐", color: "#94a3b8" },
  { id: "tired", label: "Tired", emoji: "😴", color: "#a78bfa" },
  { id: "sad", label: "Sad", emoji: "😢", color: "#38bdf8" },
  { id: "angry", label: "Angry", emoji: "😡", color: "#f87171" },
] as const;

export type MoodId = (typeof MOODS)[number]["id"];

// Map each frequency to recommended ambient sounds (5 free pairings for guest tier)
export const FREE_FREQUENCY_PAIRS: Record<string, string[]> = {
  delta: ["rain", "ocean"],
  theta: ["fire", "rain"],
  alpha: ["crickets", "pinkNoise"],
  sol396: ["ocean"],
  sol432: ["pinkNoise", "rain"],
  sol528: ["fire", "crickets"],
};

export const AVATARS = ["🌙", "⭐", "☁️", "🦊", "🐻", "🦉", "🐼", "🌸", "🍃", "🔮"];

export const MAX_SAVED_MIXES = 10;
