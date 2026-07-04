/**
 * Firebase client — initialized with the user's Firebase project config.
 * Used for Firebase Authentication (email/password) on Cloudflare Pages
 * (static export) where the Next.js API routes don't run.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let _app: FirebaseApp | null = null
let _auth: Auth | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app
  if (!firebaseConfig.apiKey) return null
  _app = initializeApp(firebaseConfig)
  return _app
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth
  const app = getFirebaseApp()
  if (!app) return null
  _auth = getAuth(app)
  return _auth
}
