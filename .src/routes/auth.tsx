import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { AVATARS } from "@/lib/sleepData";
import { toast } from "sonner";
import { NightBackground } from "@/components/NightBackground";
import { Moon } from "lucide-react";

const search = z.object({ mode: z.enum(["signin", "signup"]).default("signin") });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — SleepAura" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your name");
        await signUpEmail(email, password, name.trim(), avatar);
        toast.success(`Welcome, ${name}!`);
      } else {
        await signInEmail(email, password);
        toast.success("Welcome back");
      }
      nav({ to: "/app" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInGoogle(avatar);
      nav({ to: "/app" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen px-6 py-12 text-white">
      <NightBackground />
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 aura-text-gold hover:text-white">
          <Moon className="h-4 w-4" />
          <span className="tracking-wide font-semibold">SleepAura</span>
        </Link>
        <h1 className="mt-8 text-4xl font-bold leading-tight animate-glow-shift">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-3 text-[var(--aura-muted-2)]">
          {mode === "signup"
            ? "Unlock all 20 sounds, every frequency, custom mixing, mood graph and saved mixes."
            : "Sign in to continue your journey."}
        </p>

        <form onSubmit={submit} className="aura-card mt-8 space-y-4 p-6">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="name" className="text-slate-200">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-slate-200">Pick a profile avatar</Label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`flex h-12 items-center justify-center rounded-lg border text-2xl transition ${
                        avatar === a ? "border-[hsl(48_96%_54%)] bg-[hsl(48_96%_54%/0.18)]" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email" className="text-slate-200">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-200">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <Button type="submit" disabled={busy} className="aura-btn w-full rounded-xl py-5 text-base">
            {mode === "signup" ? "Sign up" : "Sign in"}
          </Button>

          <div className="my-2 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
          </div>
          <Button type="button" onClick={google} disabled={busy} variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10">
            Continue with Google
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {mode === "signup" ? (
            <>Already have an account? <Link to="/auth" search={{ mode: "signin" }} className="aura-text-gold hover:underline">Sign in</Link></>
          ) : (
            <>New here? <Link to="/auth" search={{ mode: "signup" }} className="aura-text-gold hover:underline">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
