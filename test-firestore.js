import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  projectId: config.projectId,
  apiKey: config.apiKey
});

const db = config.firestoreDatabaseId ? initializeFirestore(app, {}, config.firestoreDatabaseId) : getFirestore(app);

getDocs(collection(db, 'users')).then(snap => {
  console.log('Success, docs:', snap.size);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
