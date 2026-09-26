// Firebase Cloud Messaging Service Worker
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAkPaZrdeNsNxZYng2cIqpU_1OYLug7AHY",
  authDomain: "essenya-ecosistema.firebaseapp.com",
  projectId: "essenya-ecosistema",
  storageBucket: "essenya-ecosistema.firebasestorage.app",
  messagingSenderId: "588888723862",
  appId: "1:588888723862:web:56dbfdea389e08c15a4db7"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje push en segundo plano recibido:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'ESSENYA';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      url: payload.data?.url || '/cliente',
      ...payload.data
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
