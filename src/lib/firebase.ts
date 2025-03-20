import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDE5NIfideQ_PnAT2c4pdbkv3JyYhVzJuM",
  authDomain: "journal-70a58.firebaseapp.com",
  projectId: "journal-70a58",
  storageBucket: "journal-70a58.firebasestorage.app",
  messagingSenderId: "219076350528",
  appId: "1:219076350528:web:f9639e203d6452236e45a5",
  measurementId: "G-3PS926XZX2"
};

// Initialize Firebase
let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 