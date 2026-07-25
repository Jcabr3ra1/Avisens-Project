import { initializeApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

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

// Firebase es una función SECUNDARIA (solo lecturas en vivo). Si falta la
// configuración —por ejemplo, un clon del repo sin las variables VITE_FIREBASE_*—
// NO inicializamos: la app sigue funcionando sin lecturas en vivo, en lugar de
// caerse entera con un "FIREBASE FATAL ERROR" y dejar la pantalla en blanco.
const firebaseConfigurado = Boolean(
  firebaseConfig.databaseURL && firebaseConfig.projectId,
)

export const rtdb: Database | null = firebaseConfigurado
  ? getDatabase(initializeApp(firebaseConfig))
  : null

if (!firebaseConfigurado) {
  console.warn(
    '[Firebase] Sin configuración (VITE_FIREBASE_*): las lecturas en vivo de ' +
      'sensores quedan deshabilitadas; el resto de la app funciona normal.',
  )
}
