import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWaoCZzEelvs0UGPg56WmV_miQ4iQzh3Q",
  authDomain: "sleepaura-6da52.firebaseapp.com",
  projectId: "sleepaura-6da52",
  storageBucket: "sleepaura-6da52.firebasestorage.app",
  messagingSenderId: "821328540040",
  appId: "1:821328540040:web:4261e2f9e73fcad7768a3d",
  measurementId: "G-5JSGYN05S8",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
