import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Conexión a Firebase Realtime Database — usada únicamente para las lecturas
// en vivo de los sensores (ESP32 → Firebase → esta app). Todo lo demás del
// sistema (usuarios, alertas, bitácora, finanzas…) sigue viviendo en el
// backend de Avisens (NestJS + PostgreSQL); Firebase no los reemplaza.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseApp = initializeApp(firebaseConfig)

// Instancia de la Realtime Database, lista para usar con `ref()` / `onValue()`.
export const rtdb = getDatabase(firebaseApp)
