import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

export interface UserProfile {
  displayName: string;
  avatar: string;
  createdAt?: unknown;
}

interface AuthCtx {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name: string, avatar: string) => Promise<void>;
  signInGoogle: (avatar?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  needsProfileSetup: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          const ref = doc(db, "profiles", u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
            setNeedsProfileSetup(false);
          } else {
            setProfile(null);
            setNeedsProfileSetup(true);
          }
        } else {
          setProfile(null);
          setNeedsProfileSetup(false);
        }
      } catch (err) {
        console.error("[Auth] Failed to load profile:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const writeProfile = async (uid: string, data: UserProfile) => {
    await setDoc(doc(db, "profiles", uid), { ...data, createdAt: serverTimestamp() }, { merge: true });
    setProfile(data);
    setNeedsProfileSetup(false);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        profile,
        loading,
        needsProfileSetup,
        signInEmail: async (e, p) => { await signInWithEmailAndPassword(auth, e, p); },
        signUpEmail: async (e, p, name, avatar) => {
          const cred = await createUserWithEmailAndPassword(auth, e, p);
          await updateProfile(cred.user, { displayName: name });
          await writeProfile(cred.user.uid, { displayName: name, avatar });
        },
        signInGoogle: async (avatar = "🌙") => {
          const cred = await signInWithPopup(auth, googleProvider);
          const ref = doc(db, "profiles", cred.user.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await writeProfile(cred.user.uid, {
              displayName: cred.user.displayName ?? "Friend",
              avatar,
            });
          }
        },
        signOutUser: async () => { await signOut(auth); },
        updateProfileData: async (data) => {
          if (!user) return;
          const next = { ...(profile ?? { displayName: "Friend", avatar: "🌙" }), ...data };
          await writeProfile(user.uid, next);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
