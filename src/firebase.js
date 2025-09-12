// dashboard/src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
  apiKey: "AIzaSyDHkv77FfASpHnPh9MIBSmxRv-pHdu0mQQ",
  authDomain: "chatbot-viproomer.firebaseapp.com",
  projectId: "chatbot-viproomer",
  storageBucket: "chatbot-viproomer.firebasestorage.app",
  messagingSenderId: "97297204714",
  appId: "1:97297204714:web:805379e7101b1a5bf41e93",
  measurementId: "G-RB2P991267"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Autenticación anónima
const auth = getAuth(app);
signInAnonymously(auth)
  .then(() => {
    console.log("🟢 Login anónimo exitoso");
  })
  .catch((error) => {
    console.error("❌ Error en login anónimo:", error.code, error.message);
  });