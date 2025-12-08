// /scripts/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIQdnCd6iIlmefZp7w1CkBSzJbH61bOv0",
  authDomain: "sleepaura-2717c.firebaseapp.com",
  projectId: "sleepaura-2717c",
  storageBucket: "sleepaura-2717c.firebasestorage.app",
  messagingSenderId: "169320011806",
  appId: "1:169320011806:web:03456e156a7024b9e6360f"
};

// initialize
const app = initializeApp(firebaseConfig);

// export auth for use in other modules
export const auth = getAuth(app);
