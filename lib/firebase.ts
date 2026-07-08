import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-fe13f",
  appId: "1:259703544386:web:fe738cdb28faaa0effabdb",
  apiKey: "AIzaSyC6FBEh5FOgts4hso4X0KCGxmV14p7KA6s",
  authDomain: "ai-studio-applet-webapp-fe13f.firebaseapp.com",
  storageBucket: "ai-studio-applet-webapp-fe13f.firebasestorage.app",
  messagingSenderId: "259703544386",
};

const DB_ID = "ai-studio-bc187f23-984b-4046-8c68-69190c38edb7";

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Guarda uma copia local (no proprio celular/navegador) dos dados do Firestore.
// Assim, ao abrir o app com internet fraca ou momentaneamente sem conexao,
// as ultimas quadras/casas vistas aparecem na hora, e sincronizam sozinhas
// assim que a conexao voltar - em vez da tela ficar em branco esperando.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  }, DB_ID);
} catch (e) {
  // Se o navegador nao suportar (ex: modo anonimo/privado) ou o Firestore
  // ja tiver sido iniciado antes, usa a conexao normal, sem cache offline.
  console.warn("Cache offline do Firestore indisponivel, usando conexao normal.", e);
  dbInstance = getFirestore(app, DB_ID);
}

export const db = dbInstance;
