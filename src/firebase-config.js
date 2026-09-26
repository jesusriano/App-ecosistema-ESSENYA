/**
 * Firebase Web Push Messaging Configuration
 * Web Push Certificate Key Pair (VAPID)
 */

import appletConfig from '../firebase-applet-config.json';

export const vapidKey = "BHEx7m8uEh5G66_S_vknnlbzdyDQ93X4xuNbqcr-KuS5p_r0ycVGo_7bt6HAYCkABoQTFNvspi4pSOb2Nm4gNl8";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId || "",
  vapidKey: "BHEx7m8uEh5G66_S_vknnlbzdyDQ93X4xuNbqcr-KuS5p_r0ycVGo_7bt6HAYCkABoQTFNvspi4pSOb2Nm4gNl8"
};

export default firebaseConfig;
