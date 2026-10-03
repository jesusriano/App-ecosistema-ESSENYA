/**
 * Firebase Web Push Messaging Configuration
 * Web Push Certificate Key Pair (VAPID)
 */

import appletConfig from '../firebase-applet-config.json';

export const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BAUvrHF6zeG0owm8gJL997JQPueRBzedGAcRA2tsV5Kl57cXfPk8d1NR9Wtqmg8HNSkD2RK1lXBCWwNSiUfBzpY";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || "",
  vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || "BAUvrHF6zeG0owm8gJL997JQPueRBzedGAcRA2tsV5Kl57cXfPk8d1NR9Wtqmg8HNSkD2RK1lXBCWwNSiUfBzpY"
};

export default firebaseConfig;
