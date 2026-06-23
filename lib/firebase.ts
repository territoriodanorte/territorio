import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-fe13f",
  appId: "1:259703544386:web:fe738cdb28faaa0effabdb",
  apiKey: "AIzaSyC6FBEh5FOgts4hso4X0KCGxmV14p7KA6s",
  authDomain: "ai-studio-applet-webapp-fe13f.firebaseapp.com",
  storageBucket: "ai-studio-applet-webapp-fe13f.firebasestorage.app",
  messagingSenderId: "259703544386",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-bc187f23-984b-4046-8c68-69190c38edb7");
