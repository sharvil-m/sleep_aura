// /scripts/auth.js
import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

/*
  Helper functions you can call from UI:
  - authSignUp(email, pass)
  - authSignIn(email, pass)
  - authSignOut()
  And a function to attach a redirect check: requireAuthRedirect()
*/

export async function authSignUp(email, password) {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    return userCred.user;
  } catch (err) {
    throw err;
  }
}

export async function authSignIn(email, password) {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    return userCred.user;
  } catch (err) {
    throw err;
  }
}

export async function authSignOut() {
  return signOut(auth);
}

// Call this from pages where you want to *force* login (e.g., player.html)
// Usage: import { requireAuthRedirect } from '/scripts/auth.js'; requireAuthRedirect('login.html')
export function requireAuthRedirect(redirectTo = '/login.html') {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = redirectTo;
    }
  });
}

// Optional: export the raw onAuthStateChanged so you can listen in UI
export const onAuth = onAuthStateChanged;
