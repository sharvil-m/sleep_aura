import { createFileRoute, Link } from "@tanstack/react-router";
import { NightBackground } from "@/components/NightBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SleepAura 🌙 — Transform Your Sleep with Healing Frequencies" },
      {
        name: "description",
        content:
          "SleepAura blends healing frequencies with ambient soundscapes and a mood journal to guide you into deep, restorative sleep.",
      },
      { property: "og:title", content: "SleepAura 🌙 — Transform Your Sleep" },
      {
        property: "og:description",
        content:
          "Healing frequencies, 20 ambient sounds, custom mixes and a mood graph. Drift into deeper sleep.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative min-h-screen text-white">
      <NightBackground />

      {/* HERO */}
      <section className="flex min-h-screen items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-5xl">
          <div className="animate-fade-in">
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl animate-glow-shift">
              SleepAura <span>🌙</span>
            </h1>
            <p className="mt-6 text-2xl font-light text-[var(--aura-muted-2)] md:text-4xl animate-glow-shift">
              Find Your Calm. Transform Your Sleep.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--aura-muted)] md:text-lg">
              Experience the power of healing frequencies designed to guide you into peaceful
              sleep, no matter what emotions you're feeling.
            </p>
          </div>

          <div className="animate-fade-in mt-10" style={{ animationDelay: "0.2s" }}>
            <span className="aura-gold-glow inline-flex items-center gap-3 rounded-full px-8 py-4 text-lg font-semibold aura-text-gold">
              ✨ Early View
            </span>
          </div>

          <div className="animate-fade-in mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.35s" }}>
            <Link
              to="/app"
              className="aura-btn inline-flex min-w-[200px] items-center justify-center gap-2 rounded-xl px-8 py-4 text-base"
            >
              <span>▶</span> Try as guest
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-xl border border-[hsl(48_96%_54%/0.4)] bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Create free account
            </Link>
          </div>

          <div className="animate-fade-in mt-10" style={{ animationDelay: "0.6s" }}>
            <div className="aura-gold-glow inline-flex items-center gap-3 rounded-full px-6 py-3 shadow-[0_0_20px_hsl(48_96%_54%/0.25)]">
              <span className="animate-pulse-soft">✨</span>
              <span className="aura-text-gold text-sm font-semibold">A full sleep companion — free to try</span>
              <span className="animate-pulse-soft">✨</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS SLEEPAURA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold animate-glow-shift md:text-5xl">What is SleepAura?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-[var(--aura-muted-2)] md:text-lg">
            A personal sleep companion that pairs scientifically inspired healing frequencies with
            calming ambient soundscapes — tuned to how you feel tonight.
          </p>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "🎵", title: "Healing Frequencies", text: "Solfeggio tones (432Hz, 528Hz, 741Hz) and binaural Delta/Theta/Alpha waves." },
              { icon: "❤️", title: "Emotion-Based", text: "Pick how you feel — calm, stressed, restless — and get a soundscape that fits." },
              { icon: "🌊", title: "20 Ambient Sounds", text: "Rain, ocean, fire, forest, crickets, brown noise, singing bowls and more." },
            ].map((c) => (
              <div key={c.title} className="aura-card aura-card-hover p-8">
                <div className="aura-gold-glow mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl">
                  {c.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold aura-text-gold">{c.title}</h3>
                <p className="text-[var(--aura-muted-2)]">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY SIGN IN */}
      <section className="bg-[linear-gradient(145deg,hsl(240_10%_6%),hsl(240_10%_4%))] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold animate-glow-shift md:text-5xl">
            Why create a free account?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-[var(--aura-muted-2)] md:text-lg">
            Guest mode gives you a taste — signing in unlocks the full SleepAura experience.
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="aura-card aura-card-hover p-6">
              <div className="mb-3 text-2xl">🆓</div>
              <h3 className="text-lg font-bold text-white">Guest</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--aura-muted-2)]">
                <li>• 5 starter ambient sounds</li>
                <li>• 6 basic frequencies</li>
                <li>• Auto-paired soundscapes</li>
                <li>• No custom mixing or saving</li>
                <li>• Mood is forgotten when you leave</li>
              </ul>
            </div>

            <div className="aura-card aura-card-hover relative overflow-hidden border-[hsl(48_96%_54%/0.45)] p-6 shadow-[0_0_40px_hsl(48_96%_54%/0.15)]">
              <span className="absolute right-3 top-3 rounded-full bg-[hsl(48_96%_54%/0.2)] px-2 py-0.5 text-xs font-semibold aura-text-gold">
                Recommended
              </span>
              <div className="mb-3 text-2xl">🌟</div>
              <h3 className="text-lg font-bold aura-text-gold">Signed in</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--aura-muted-2)]">
                <li>✓ All 20 ambient sounds unlocked</li>
                <li>✓ All 13 healing frequencies</li>
                <li>✓ Custom mixing with per-sound volume</li>
                <li>✓ Save up to 10 personal mixes</li>
                <li>✓ Daily mood journal with a 14-day graph</li>
                <li>✓ Picks up where you left off — across devices</li>
              </ul>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="aura-btn mt-5 inline-flex w-full items-center justify-center rounded-xl px-6 py-3"
              >
                Create free account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold animate-glow-shift md:text-5xl">How It Works</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[var(--aura-muted-2)]">
            Three simple steps to transform your sleep tonight.
          </p>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              { n: 1, t: "Choose a Frequency", d: "Pick a healing tone or brainwave that matches your state." },
              { n: 2, t: "Layer Your Sounds", d: "Mix ambient soundscapes and adjust each one's volume." },
              { n: 3, t: "Drift Into Sleep", d: "Log your mood, save the mix, and let the aura carry you off." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-[hsl(240_45%_9%)] shadow-[0_4px_20px_hsl(48_96%_54%/0.5)] [background:linear-gradient(145deg,hsl(48_96%_54%),hsl(48_96%_48%))]">
                  {s.n}
                </div>
                <h3 className="text-xl font-bold aura-text-gold">{s.t}</h3>
                <p className="mt-2 text-[var(--aura-muted)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREQUENCIES */}
      <section className="bg-[linear-gradient(145deg,hsl(240_10%_6%),hsl(240_10%_4%))] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold animate-glow-shift md:text-5xl">Healing Frequencies</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--aura-muted-2)]">
            Each frequency targets a different emotional and physiological state.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "😠", f: "528Hz", t: "Calm Anger", d: "Dissolve tension and let go of stress" },
              { icon: "😢", f: "396Hz", t: "Lift Sadness", d: "Soothe emotional heaviness" },
              { icon: "😊", f: "432Hz", t: "Balance Energy", d: "Find harmony when excited" },
              { icon: "🥱", f: "Theta 6Hz", t: "Deep Sleep", d: "Ease into natural sleep cycles" },
              { icon: "😩", f: "852Hz", t: "Stress Relief", d: "Release mental pressure" },
              { icon: "🤯", f: "741Hz", t: "Ease Overthinking", d: "Reduce racing thoughts" },
            ].map((f) => (
              <div key={f.t} className="aura-card aura-card-hover relative p-7 text-center">
                <div className="aura-gold-glow mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl">
                  {f.icon}
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest aura-text-gold">{f.f}</div>
                <h3 className="mt-1 text-lg font-bold text-white">{f.t}</h3>
                <p className="mt-2 text-sm text-[var(--aura-muted-2)]">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-28 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold animate-glow-shift md:text-5xl">Ready to Transform Your Sleep?</h2>
          <p className="mt-4 text-[var(--aura-muted)]">
            Start your journey to peaceful, restorative sleep tonight.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/app" className="aura-btn inline-flex min-w-[220px] items-center justify-center rounded-xl px-8 py-5 text-lg">
              Get Started Now
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="inline-flex min-w-[220px] items-center justify-center rounded-xl border border-[hsl(48_96%_54%/0.4)] bg-white/5 px-8 py-5 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[hsl(215_16%_63%/0.2)] px-6 py-8 text-center text-sm text-[var(--aura-muted)]">
        SleepAura © 2026 • Created to help you find peace before sleep
      </footer>
    </div>
  );
}
