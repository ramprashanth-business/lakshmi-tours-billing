import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Paste your own Firebase project's web config here.
// Find it in the Firebase console: Project settings (gear icon) > General > Your apps > SDK setup and configuration.
// These values are not secret — Firestore security rules (see firestore.rules) are what actually protect the data.
const firebaseConfig = {
  apiKey: "AIzaSyA2SR8ujxpMQfFT5boRPmYcaIdHYfIl1Jk",
  authDomain: "lakshmi-tours-billing-cac60.firebaseapp.com",
  projectId: "lakshmi-tours-billing-cac60",
  storageBucket: "lakshmi-tours-billing-cac60.firebasestorage.app",
  messagingSenderId: "166441999092",
  appId: "1:166441999092:web:bc2509a0ce09b10f7f1ca1"
};


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
