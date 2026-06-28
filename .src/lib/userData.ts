import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { MAX_SAVED_MIXES } from "./sleepData";

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  mood: string;
  note?: string;
}

export interface SavedMix {
  id: string;
  name: string;
  sounds: { id: string; volume: number }[];
  frequencyId?: string | null;
  createdAt: number;
}

export async function setMood(uid: string, entry: MoodEntry) {
  await setDoc(doc(db, "users", uid, "moods", entry.date), entry);
}

export async function getMoods(uid: string): Promise<MoodEntry[]> {
  const q = query(collection(db, "users", uid, "moods"), orderBy("date", "desc"), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MoodEntry);
}

export async function listMixes(uid: string): Promise<SavedMix[]> {
  const snap = await getDocs(collection(db, "users", uid, "mixes"));
  return snap.docs.map((d) => d.data() as SavedMix).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveMix(uid: string, mix: SavedMix, existingCount: number) {
  if (existingCount >= MAX_SAVED_MIXES) {
    throw new Error(`You've reached the limit of ${MAX_SAVED_MIXES} saved mixes.`);
  }
  await setDoc(doc(db, "users", uid, "mixes", mix.id), mix);
}

export async function deleteMix(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "mixes", id));
}
