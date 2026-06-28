import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/AuthContext";
import {
  AMBIENT_SOUNDS,
  FREQUENCIES,
  MOODS,
  AVATARS,
  FREE_FREQUENCY_PAIRS,
  MAX_SAVED_MIXES,
  type MoodId,
  type AmbientSound,
  type FrequencyPreset,
} from "@/lib/sleepData";
import { playAmbient, playFrequency, type PlayingHandle } from "@/lib/audioEngine";
import {
  getMoods,
  setMood,
  listMixes,
  saveMix,
  deleteMix,
  type MoodEntry,
  type SavedMix,
} from "@/lib/userData";
import { toast } from "sonner";
import { LogOut, Music, History, Save, X, Trash2, Sparkles, Lock, Moon, Timer } from "lucide-react";
import { NightBackground } from "@/components/NightBackground";
import { MoodGraph } from "@/components/MoodGraph";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "SleepAura" }] }),
  component: AppPage,
});

const todayKey = () => new Date().toISOString().slice(0, 10);
const TIMER_OPTIONS = [0, 15, 30, 60, 90]; // 0 = no timer
const SOUND_VOLUME = 0.5;
const FREQ_VOLUME = 0.2;
const FADE_MS = 60_000;

type PendingFreq = { freqId: string; timerMin: number } | null;

function AppPage() {
  const { user, profile, loading, needsProfileSetup, signOutUser, updateProfileData } = useAuth();
  const nav = useNavigate();
  const isGuest = !user;

  const [tab, setTab] = useState<"sounds" | "history">("sounds");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupAvatar, setSetupAvatar] = useState(AVATARS[0]);

  // Audio state
  const [playing, setPlaying] = useState<Record<string, number>>({}); // soundId -> volume
  const [activeFreq, setActiveFreq] = useState<string | null>(null);
  const handlesRef = useRef<Record<string, PlayingHandle>>({});
  const freqHandleRef = useRef<PlayingHandle | null>(null);

  // Per-sound sleep timers
  const [timers, setTimers] = useState<Record<string, number>>({}); // id -> endsAt ms
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [, setNowTick] = useState(0);

  // Fades
  const fadesRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [fadingOut, setFadingOut] = useState(false);

  // Pending frequency awaiting pairing choice
  const [pendingFreq, setPendingFreq] = useState<PendingFreq>(null);
  const ambientSectionRef = useRef<HTMLDivElement | null>(null);

  const cancelFade = (key: string) => {
    if (fadesRef.current[key]) {
      clearInterval(fadesRef.current[key]);
      delete fadesRef.current[key];
    }
  };

  const fadeVolume = (
    key: string,
    from: number,
    to: number,
    apply: (v: number) => void,
    onDone?: () => void,
  ) => {
    cancelFade(key);
    const start = performance.now();
    apply(from);
    fadesRef.current[key] = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / FADE_MS);
      apply(from + (to - from) * t);
      if (t >= 1) {
        cancelFade(key);
        onDone?.();
      }
    }, 100);
  };

  // Data
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [mixes, setMixes] = useState<SavedMix[]>([]);

  useEffect(() => {
    if (user && profile && !sessionStorage.getItem("welcomed_" + user.uid)) {
      setShowWelcome(true);
      sessionStorage.setItem("welcomed_" + user.uid, "1");
    }
  }, [user, profile]);

  useEffect(() => {
    if (needsProfileSetup) {
      setSetupName(user?.displayName ?? "");
      setShowSetup(true);
    }
  }, [needsProfileSetup, user]);

  useEffect(() => {
    if (!user) { setMoods([]); setMixes([]); return; }
    void getMoods(user.uid).then(setMoods);
    void listMixes(user.uid).then(setMixes);
  }, [user]);

  useEffect(() => () => {
    Object.values(fadesRef.current).forEach(clearInterval);
    Object.values(handlesRef.current).forEach((h) => h.stop());
    freqHandleRef.current?.stop();
    Object.values(timeoutsRef.current).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (Object.keys(timers).length === 0) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timers]);

  const clearTimer = (id: string) => {
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
    setTimers((t) => {
      if (!(id in t)) return t;
      const n = { ...t }; delete n[id]; return n;
    });
  };

  const scheduleTimer = (id: string, minutes: number, onEnd: () => void) => {
    clearTimer(id);
    if (minutes <= 0) return;
    const endsAt = Date.now() + minutes * 60_000;
    timeoutsRef.current[id] = setTimeout(() => {
      onEnd();
      clearTimer(id);
    }, minutes * 60_000);
    setTimers((t) => ({ ...t, [id]: endsAt }));
  };

  const sounds = isGuest ? AMBIENT_SOUNDS.filter((s) => s.free) : AMBIENT_SOUNDS;
  const frequencies = isGuest ? FREQUENCIES.filter((f) => f.free) : FREQUENCIES;

  const todaysMood = useMemo(() => moods.find((m) => m.date === todayKey())?.mood, [moods]);

  // Start an ambient sound with optional sleep timer
  const startSound = (id: string, minutes: number) => {
    const sound = AMBIENT_SOUNDS.find((s) => s.id === id);
    if (!sound) return;
    // Stop if already playing first
    if (handlesRef.current[id]) {
      cancelFade(id);
      handlesRef.current[id].stop();
      delete handlesRef.current[id];
      clearTimer(id);
    }
    handlesRef.current[id] = playAmbient(sound, 0);
    setPlaying((p) => ({ ...p, [id]: 0 }));
    fadeVolume(id, 0, SOUND_VOLUME, (v) => {
      handlesRef.current[id]?.setVolume(v);
      setPlaying((p) => (id in p ? { ...p, [id]: v } : p));
    });
    scheduleTimer(id, minutes, () => {
      handlesRef.current[id]?.stop();
      delete handlesRef.current[id];
      setPlaying((p) => { const n = { ...p }; delete n[id]; return n; });
      toast.info(`Timer ended for ${sound.name}`);
    });
  };

  const stopSound = (id: string) => {
    cancelFade(id);
    handlesRef.current[id]?.stop();
    delete handlesRef.current[id];
    clearTimer(id);
    setPlaying((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  // Frequency: clicking a card opens the timer popover. After timer is chosen,
  // we set pendingFreq and scroll to the ambient sounds section so the user
  // can choose whether to layer in the paired ambient sounds.
  const onFreqTimerChosen = (freqId: string, timerMin: number) => {
    setPendingFreq({ freqId, timerMin });
    setTimeout(() => {
      ambientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const startFrequency = (id: string, minutes: number) => {
    const f = FREQUENCIES.find((x) => x.id === id);
    if (!f) return;
    cancelFade("freq");
    freqHandleRef.current?.stop();
    freqHandleRef.current = playFrequency(f, 0);
    setActiveFreq(id);
    fadeVolume("freq", 0, FREQ_VOLUME, (v) => freqHandleRef.current?.setVolume(v));
    scheduleTimer("__freq", minutes, () => {
      cancelFade("freq");
      freqHandleRef.current?.stop();
      freqHandleRef.current = null;
      setActiveFreq(null);
      toast.info(`Frequency timer ended`);
    });
  };

  const stopFrequency = () => {
    cancelFade("freq");
    freqHandleRef.current?.stop();
    freqHandleRef.current = null;
    setActiveFreq(null);
    clearTimer("__freq");
  };

  // Confirm pending frequency with chosen mode
  const confirmPendingFreq = (mode: "alone" | "with-ambient") => {
    if (!pendingFreq) return;
    const { freqId, timerMin } = pendingFreq;
    startFrequency(freqId, timerMin);
    if (mode === "with-ambient") {
      // Stop existing ambients and start the paired ones (free guest pairing applies to all)
      Object.keys(handlesRef.current).forEach((k) => stopSound(k));
      const paired = FREE_FREQUENCY_PAIRS[freqId] ?? [];
      paired.forEach((sid) => startSound(sid, timerMin));
    }
    setPendingFreq(null);
    const f = FREQUENCIES.find((x) => x.id === freqId);
    toast.success(`Playing ${f?.name}${mode === "with-ambient" ? " + ambient" : ""}`);
  };

  const cancelPending = () => setPendingFreq(null);

  const stopAll = () => {
    Object.keys(fadesRef.current).forEach(cancelFade);
    Object.values(handlesRef.current).forEach((h) => h.stop());
    handlesRef.current = {};
    setPlaying({});
    freqHandleRef.current?.stop();
    freqHandleRef.current = null;
    setActiveFreq(null);
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};
    setTimers({});
    setFadingOut(false);
    setPendingFreq(null);
  };

  const fadeOutAll = () => {
    const ids = Object.keys(handlesRef.current);
    if (ids.length === 0 && !freqHandleRef.current) return;
    setFadingOut(true);
    ids.forEach((id) => {
      const from = playing[id] ?? SOUND_VOLUME;
      fadeVolume(id, from, 0, (v) => {
        handlesRef.current[id]?.setVolume(v);
        setPlaying((p) => (id in p ? { ...p, [id]: v } : p));
      });
    });
    if (freqHandleRef.current) {
      fadeVolume("freq", FREQ_VOLUME, 0, (v) => freqHandleRef.current?.setVolume(v));
    }
    setTimeout(() => stopAll(), FADE_MS + 100);
    toast.info("Fading out over 1 minute…");
  };

  const recordMood = async (mood: MoodId) => {
    if (!user) { toast.info("Sign in to track your mood"); return; }
    const entry: MoodEntry = { date: todayKey(), mood };
    await setMood(user.uid, entry);
    setMoods((m) => [entry, ...m.filter((x) => x.date !== entry.date)]);
    toast.success(`Mood logged: ${MOODS.find((x) => x.id === mood)?.label}`);
  };

  const handleSaveMix = async () => {
    if (!user) return toast.info("Sign in to save mixes");
    if (mixes.length >= MAX_SAVED_MIXES) {
      return toast.error(`You've reached the limit of ${MAX_SAVED_MIXES} saved mixes.`);
    }
    if (Object.keys(playing).length === 0 && !activeFreq) {
      return toast.error("Start playing some sounds first");
    }
    const name = prompt("Name this mix:") ?? "";
    if (!name.trim()) return;
    const mix: SavedMix = {
      id: crypto.randomUUID(),
      name: name.trim(),
      sounds: Object.entries(playing).map(([id, volume]) => ({ id, volume })),
      frequencyId: activeFreq,
      createdAt: Date.now(),
    };
    await saveMix(user.uid, mix, mixes.length);
    setMixes((m) => [mix, ...m]);
    toast.success("Mix saved");
  };

  const playMix = (mix: SavedMix) => {
    stopAll();
    mix.sounds.forEach(({ id }) => startSound(id, 0));
    if (mix.frequencyId) startFrequency(mix.frequencyId, 0);
    toast.success(`Playing: ${mix.name}`);
  };

  const removeMix = async (id: string) => {
    if (!user) return;
    await deleteMix(user.uid, id);
    setMixes((m) => m.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center text-slate-400">
        <NightBackground />
        Loading…
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white">
      <NightBackground />
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-6 aura-text-gold md:px-6">
        <div className="relative">
          <Moon className="h-5 w-5" />
          <div className="absolute inset-0 -z-10 rounded-full bg-[hsl(48_96%_54%/0.6)] blur-md" />
        </div>
        <Link to="/" className="text-lg tracking-wide">SleepAura</Link>
      </div>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full aura-btn rounded-lg/20 text-2xl">
                {profile?.avatar ?? "👋"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{profile?.displayName ?? "Guest"}</div>
                <div className="text-xs text-slate-400">{isGuest ? "Guest mode" : "Signed in"}</div>
              </div>
            </div>
            <nav className="space-y-1">
              <SideBtn active={tab === "sounds"} onClick={() => setTab("sounds")} icon={<Music className="h-4 w-4" />}>Sounds</SideBtn>
              <SideBtn active={tab === "history"} onClick={() => setTab("history")} icon={<History className="h-4 w-4" />}>History</SideBtn>
            </nav>
            <div className="mt-6 border-t border-white/10 pt-4">
              {isGuest ? (
                <Button asChild className="w-full aura-btn rounded-lg">
                  <Link to="/auth" search={{ mode: "signup" }}>Sign up — unlock all</Link>
                </Button>
              ) : (
                <Button onClick={() => signOutUser().then(() => nav({ to: "/" }))} variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              )}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 md:hidden">
            <Button size="sm" variant={tab === "sounds" ? "default" : "outline"} className={tab === "sounds" ? "" : "border-white/20 bg-transparent text-white"} onClick={() => setTab("sounds")}>Sounds</Button>
            <Button size="sm" variant={tab === "history" ? "default" : "outline"} className={tab === "history" ? "" : "border-white/20 bg-transparent text-white"} onClick={() => setTab("history")}>History</Button>
            {isGuest && <Button size="sm" asChild className="ml-auto aura-btn rounded-lg"><Link to="/auth" search={{ mode: "signup" }}>Sign up</Link></Button>}
          </div>

          {tab === "sounds" ? (
            <SoundsView
              isGuest={isGuest}
              sounds={sounds}
              frequencies={frequencies}
              playing={playing}
              activeFreq={activeFreq}
              timers={timers}
              pendingFreq={pendingFreq}
              ambientSectionRef={ambientSectionRef}
              onStartSound={startSound}
              onStopSound={stopSound}
              onFreqTimerChosen={onFreqTimerChosen}
              onStopFrequency={stopFrequency}
              onConfirmPending={confirmPendingFreq}
              onCancelPending={cancelPending}
              onStopAll={stopAll}
              onFadeOut={fadeOutAll}
              fadingOut={fadingOut}
              onSave={handleSaveMix}
              mixes={mixes}
              onPlayMix={playMix}
              onDeleteMix={removeMix}
              todaysMood={todaysMood}
              onRecordMood={recordMood}
            />
          ) : (
            <HistoryView moods={moods} isGuest={isGuest} />
          )}
        </main>
      </div>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="border-white/10 bg-[#0b1226]/95 text-white backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light">Welcome, <span className="aura-text-gold">{profile?.displayName ?? "friend"}</span> {profile?.avatar}</DialogTitle>
            <DialogDescription className="text-slate-300">
              You're signed in. Enjoy all 20 ambient sounds, every frequency, and track your mood each day.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showSetup} onOpenChange={() => {}}>
        <DialogContent className="border-white/10 bg-[#0b1226]/95 text-white backdrop-blur" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Set up your profile</DialogTitle>
            <DialogDescription className="text-slate-300">Choose a display name and avatar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="Your name" className="bg-white/5 border-white/10 text-white" />
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setSetupAvatar(a)} className={`flex h-12 items-center justify-center rounded-lg border text-2xl ${setupAvatar === a ? "border-[hsl(48_96%_54%)] aura-btn rounded-lg/20" : "border-white/10 bg-white/5"}`}>{a}</button>
              ))}
            </div>
            <Button
              className="w-full aura-btn rounded-lg"
              disabled={!setupName.trim()}
              onClick={async () => {
                await updateProfileData({ displayName: setupName.trim(), avatar: setupAvatar });
                setShowSetup(false);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SideBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "aura-btn rounded-lg/20 text-white" : "text-slate-300 hover:bg-white/5"}`}
    >
      {icon}{children}
    </button>
  );
}

interface SoundsViewProps {
  isGuest: boolean;
  sounds: AmbientSound[];
  frequencies: FrequencyPreset[];
  playing: Record<string, number>;
  activeFreq: string | null;
  timers: Record<string, number>;
  pendingFreq: PendingFreq;
  ambientSectionRef: React.RefObject<HTMLDivElement | null>;
  onStartSound: (id: string, minutes: number) => void;
  onStopSound: (id: string) => void;
  onFreqTimerChosen: (id: string, minutes: number) => void;
  onStopFrequency: () => void;
  onConfirmPending: (mode: "alone" | "with-ambient") => void;
  onCancelPending: () => void;
  onStopAll: () => void;
  onFadeOut: () => void;
  fadingOut: boolean;
  onSave: () => void;
  mixes: SavedMix[];
  onPlayMix: (m: SavedMix) => void;
  onDeleteMix: (id: string) => void;
  todaysMood: string | undefined;
  onRecordMood: (m: MoodId) => void;
}

function SoundsView(p: SoundsViewProps) {
  const lockedSounds = AMBIENT_SOUNDS.length - p.sounds.length;
  const lockedFreqs = FREQUENCIES.length - p.frequencies.length;
  const pendingFreqObj = p.pendingFreq ? FREQUENCIES.find((f) => f.id === p.pendingFreq!.freqId) : null;

  return (
    <div className="space-y-6">
      {/* Mood */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">How do you feel today?</h2>
          {p.todaysMood && <span className="text-xs text-slate-400">Logged: {MOODS.find((m) => m.id === p.todaysMood)?.emoji}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => {
            const active = p.todaysMood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => p.onRecordMood(m.id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${active ? "border-[hsl(48_96%_54%)] aura-btn rounded-lg/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                <span className="text-lg">{m.emoji}</span>{m.label}
              </button>
            );
          })}
        </div>
        {p.isGuest && <p className="mt-3 text-xs text-slate-400"><Lock className="mr-1 inline h-3 w-3" />Sign in to remember your moods over time.</p>}
      </section>

      {/* Frequencies */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="section-title flex-1">Healing Frequencies</h2>
          {p.activeFreq && (
            <button onClick={p.onStopFrequency} className="text-xs text-slate-300 hover:text-white">Stop frequency</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {p.frequencies.map((f) => {
            const isActive = p.activeFreq === f.id;
            const isPending = p.pendingFreq?.freqId === f.id;
            return (
              <TimerPopover
                key={f.id}
                disabled={isActive}
                onPick={(min) => p.onFreqTimerChosen(f.id, min)}
              >
                <button
                  className={`freq-card w-full rounded-xl p-3 pb-5 text-left ${isActive ? "is-active" : ""} ${isPending ? "ring-1 ring-[hsl(48_96%_54%/0.5)]" : ""}`}
                  onClick={() => { if (isActive) p.onStopFrequency(); }}
                >
                  <span className="hz-badge">{f.hz}Hz{f.binaural ? ` · ${f.binaural}Hz` : ""}</span>
                  <div className="text-sm font-semibold leading-tight text-white pr-14">{f.name}</div>
                  <div className="mt-1 text-[11px] text-white/55">{f.description}</div>
                  {isActive && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] aura-text-gold">
                      <span className="eq-bars"><span/><span/><span/><span/></span>
                      playing
                    </div>
                  )}
                  <span className="wave" aria-hidden />
                </button>
              </TimerPopover>
            );
          })}
        </div>
        {lockedFreqs > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-400">
            <Lock className="mr-1 inline h-3 w-3" /> {lockedFreqs} more frequencies unlock when you sign in.
          </div>
        )}
      </section>

      {/* Ambient sounds */}
      <section ref={p.ambientSectionRef} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title flex-1 min-w-[10rem]">Ambient Sounds</h2>
          <div className="flex flex-wrap gap-2">
            {!p.isGuest && (
              <Button size="sm" onClick={p.onSave} className="aura-btn rounded-lg">
                <Save className="mr-1 h-3.5 w-3.5" /> Save mix
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={p.onFadeOut} disabled={p.fadingOut}>
              <Timer className="mr-1 h-3.5 w-3.5" /> {p.fadingOut ? "Fading…" : "Fade out (1m)"}
            </Button>
            <Button size="sm" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={p.onStopAll}>
              <X className="mr-1 h-3.5 w-3.5" /> Stop all
            </Button>
          </div>
        </div>

        {/* Pending frequency pairing choice */}
        {pendingFreqObj && (
          <div className="mb-4 rounded-xl border border-[hsl(48_96%_54%/0.4)] bg-[hsl(48_96%_54%/0.08)] p-4">
            <div className="mb-3 text-sm">
              <span className="aura-text-gold font-semibold">{pendingFreqObj.name}</span>
              <span className="text-white/60"> · {p.pendingFreq!.timerMin > 0 ? `${p.pendingFreq!.timerMin}m timer` : "no timer"} — play with ambient sounds?</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => p.onConfirmPending("alone")} variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                Just the frequency
              </Button>
              <Button size="sm" onClick={() => p.onConfirmPending("with-ambient")} className="aura-btn rounded-lg">
                With ambient sounds
              </Button>
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={p.onCancelPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {p.sounds.map((s) => {
            const active = s.id in p.playing;
            const endsAt = p.timers[s.id];
            return (
              <TimerPopover
                key={s.id}
                disabled={active}
                onPick={(min) => p.onStartSound(s.id, min)}
              >
                <button
                  onClick={() => { if (active) p.onStopSound(s.id); }}
                  className={`sound-card w-full rounded-xl p-3 text-left ${active ? "is-active" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="sc-emoji">{s.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold leading-tight text-white">{s.name}</div>
                      <div className="truncate text-[11px] text-white/55">{s.summary}</div>
                    </div>
                  </div>
                  {active && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] aura-text-gold">
                        <span className="eq-bars"><span/><span/><span/><span/></span>
                        playing
                      </span>
                      {endsAt && <CountdownLabel endsAt={endsAt} />}
                    </div>
                  )}
                  {!active && endsAt && <CountdownLabel endsAt={endsAt} />}
                </button>
              </TimerPopover>
            );
          })}
        </div>
        {lockedSounds > 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-400">
            <Lock className="mr-1 inline h-3 w-3" /> {lockedSounds} more sounds unlock when you sign in.
          </div>
        )}
      </section>

      {/* Saved mixes */}
      {!p.isGuest && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Your Mixes</h2>
            <span className="text-xs text-slate-400">{p.mixes.length} / {MAX_SAVED_MIXES}</span>
          </div>
          {p.mixes.length === 0 ? (
            <p className="text-sm text-slate-400">No saved mixes yet. Play some sounds and hit "Save mix".</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {p.mixes.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                  <button onClick={() => p.onPlayMix(m)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.sounds.length} sounds{m.frequencyId ? " + frequency" : ""}</div>
                  </button>
                  <button onClick={() => p.onDeleteMix(m.id)} className="ml-2 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {p.isGuest && (
        <section className="rounded-2xl border border-[hsl(48_96%_54%/0.4)] aura-btn rounded-lg/10 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 aura-text-gold" />
            <div>
              <h3 className="font-semibold">Unlock the full experience</h3>
              <p className="mt-1 text-sm text-slate-300">All 20 sounds, every frequency, mood history, and up to {MAX_SAVED_MIXES} saved mixes.</p>
              <Button asChild className="mt-3 aura-btn rounded-lg"><Link to="/auth" search={{ mode: "signup" }}>Create free account</Link></Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TimerPopover({
  children,
  disabled,
  onPick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPick: (minutes: number) => void;
}) {
  const [open, setOpen] = useState(false);
  if (disabled) return <>{children}</>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto border-white/10 bg-[#0b1226]/95 p-2 text-white backdrop-blur">
        <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wide text-white/50">Sleep timer</div>
        <div className="flex flex-wrap gap-1.5">
          {TIMER_OPTIONS.map((min) => (
            <button
              key={min}
              onClick={() => { onPick(min); setOpen(false); }}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
            >
              {min === 0 ? "No timer" : `${min}m`}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CountdownLabel({ endsAt }: { endsAt: number }) {
  const remaining = Math.max(0, endsAt - Date.now());
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");
  return (
    <div className="mt-2 flex items-center gap-1 text-[11px] text-white/60">
      <Timer className="h-3 w-3" />
      <span className="font-mono">{mm}:{ss}</span>
    </div>
  );
}

function HistoryView({ moods, isGuest }: { moods: MoodEntry[]; isGuest: boolean }) {
  if (isGuest) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <Lock className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <h2 className="text-lg font-semibold">Mood history is for members</h2>
        <p className="mt-2 text-slate-300">Sign in to see your mood trends over time.</p>
        <Button asChild className="mt-4 aura-btn rounded-lg"><Link to="/auth" search={{ mode: "signup" }}>Sign up</Link></Button>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <MoodGraph moods={moods} />
      {moods.length === 0 ? (
        <div className="aura-card p-8 text-center text-slate-400">No mood entries yet. Log how you feel today!</div>
      ) : (
        <div className="aura-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">Mood History</h2>
          <div className="space-y-2">
            {moods.map((m) => {
              const mood = MOODS.find((x) => x.id === m.mood);
              const d = new Date(m.date + "T00:00:00");
              return (
                <div key={m.date} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mood?.emoji}</span>
                    <div>
                      <div className="text-sm font-medium">{mood?.label}</div>
                      <div className="text-xs text-slate-400">{d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
