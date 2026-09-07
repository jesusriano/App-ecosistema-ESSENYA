import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import appletConfig from '../firebase-applet-config.json' with { type: 'json' };

const projectId = appletConfig.projectId;
const databaseId = appletConfig.firestoreDatabaseId;

console.log(`Initializing modular firebase-admin for Project: ${projectId}, DB: ${databaseId}...`);

try {
  initializeApp({
    projectId: projectId,
  });

  const db = getFirestore(databaseId);
  
  console.log('Querying users collection...');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users:`);
  usersSnap.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Nombre: ${data.nombre || data.name} | Correo: ${data.correo || data.email} | Rol: ${data.rol}`);
  });

} catch (err: any) {
  console.error('Error running list-users script:', err);
}
