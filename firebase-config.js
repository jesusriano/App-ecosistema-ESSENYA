/**
 * Firebase Web Push Messaging Configuration
 * Web Push Certificate Key Pair (VAPID)
 */

export const vapidKey = "BHEx7m8uEh5G66_S_vknnlbzdyDQ93X4xuNbqcr-KuS5p_r0ycVGo_7bt6HAYCkABoQTFNvspi4pSOb2Nm4gNl8";

export const firebaseConfig = {
  projectId: "essenya-ecosistema",
  appId: "1:588888723862:web:56dbfdea389e08c15a4db7",
  apiKey: "AIzaSyAkPaZrdeNsNxZYng2cIqpU_1OYLug7AHY",
  authDomain: "essenya-ecosistema.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-essenya-4bebd9eb-3f06-4b4e-a5fc-4349bc9b5cc8",
  storageBucket: "essenya-ecosistema.firebasestorage.app",
  messagingSenderId: "588888723862",
  vapidKey: "BHEx7m8uEh5G66_S_vknnlbzdyDQ93X4xuNbqcr-KuS5p_r0ycVGo_7bt6HAYCkABoQTFNvspi4pSOb2Nm4gNl8"
};

if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.vapidKey = vapidKey;
}

if (typeof self !== 'undefined') {
  self.firebaseConfig = firebaseConfig;
  self.vapidKey = vapidKey;
}

export default firebaseConfig;
