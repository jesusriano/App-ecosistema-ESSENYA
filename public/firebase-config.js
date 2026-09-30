/**
 * Firebase Web Push Messaging Configuration
 * Web Push Certificate Key Pair (VAPID)
 */

const vapidKey = "BDEoPYVIWr6y69eA98bjgPGLyKJSxhut4tp_rr0AuZOBlRoe9zY92NwmKSpKCKWI2nJY45ET5Z_YJkETbaxu6PE";

const firebaseConfig = {
  projectId: "essenya-ecosistema",
  appId: "1:588888723862:web:56dbfdea389e08c15a4db7",
  apiKey: "AIzaSyAkPaZrdeNsNxZYng2cIqpU_1OYLug7AHY",
  authDomain: "essenya-ecosistema.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-essenya-4bebd9eb-3f06-4b4e-a5fc-4349bc9b5cc8",
  storageBucket: "essenya-ecosistema.firebasestorage.app",
  messagingSenderId: "588888723862",
  vapidKey: vapidKey
};

if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.vapidKey = vapidKey;
}

if (typeof self !== 'undefined') {
  self.firebaseConfig = firebaseConfig;
  self.vapidKey = vapidKey;
}
