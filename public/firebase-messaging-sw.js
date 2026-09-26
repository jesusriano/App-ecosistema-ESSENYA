// ESSENYA Compatibility Proxy
// Delegates all background push events directly to the unified service-worker.js
// preventing competing Service Worker scopes.
/* eslint-disable no-undef */
importScripts('/service-worker.js');
