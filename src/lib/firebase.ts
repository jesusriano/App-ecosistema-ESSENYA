import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';
import appletConfig from '../../firebase-applet-config.json';
import { vapidKey as configVapidKey, firebaseConfig as fullConfig } from '../firebase-config.js';

export const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || configVapidKey || "BAUvrHF6zeG0owm8gJL997JQPueRBzedGAcRA2tsV5Kl57cXfPk8d1NR9Wtqmg8HNSkD2RK1lXBCWwNSiUfBzpY";

// Single source of truth for Firebase Production Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fullConfig.apiKey || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fullConfig.authDomain || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fullConfig.projectId || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fullConfig.storageBucket || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fullConfig.messagingSenderId || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fullConfig.appId || appletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fullConfig.measurementId || appletConfig.measurementId || ""
};

// Initialize Firebase App safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with resilient cache and fallback
const dbId = appletConfig.firestoreDatabaseId || undefined;
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, dbId);
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      ignoreUndefinedProperties: true
    }, dbId);
  } catch {
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = firestoreInstance;
export const storage = getStorage(app);

// Firebase Cloud Messaging instance
let messagingInstance: Messaging | null = null;
export async function getMessagingService(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Messaging is not supported or failed to initialize:', err);
    return null;
  }
}

export default app;

