import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, query } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json' with { type: 'json' };

const PRESERVED_EMAIL = 'essenya222@gmail.com';

console.log('==================================================');
console.log('ESSENYA - CLIENT-SIDE FIRESTORE CLEANUP UTILITY');
console.log('==================================================');
console.log(`Project ID: ${appletConfig.projectId}`);
console.log(`Preserved Email: ${PRESERVED_EMAIL}`);
console.log('--------------------------------------------------');

async function cleanCollection(db: any, colName: string) {
  console.log(`Cleaning collection: '${colName}'...`);
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);
  
  if (snapshot.empty) {
    console.log(`  Collection '${colName}' is already empty.`);
    return;
  }

  const docs = snapshot.docs;
  console.log(`  Found ${docs.length} documents in '${colName}'. Deleting in batches...`);
  
  let count = 0;
  while (count < docs.length) {
    const batch = writeBatch(db);
    const chunk = docs.slice(count, count + 200);
    
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    
    await batch.commit();
    count += chunk.length;
    console.log(`  Deleted batch of ${chunk.length} docs. Total deleted: ${count}/${docs.length}`);
  }
}

async function cleanUsersCollection(db: any, colName: string) {
  console.log(`Cleaning user/admin profile collection: '${colName}' (preserving ${PRESERVED_EMAIL})...`);
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);
  
  if (snapshot.empty) {
    console.log(`  Collection '${colName}' is empty.`);
    return;
  }

  const docsToKeep: string[] = [];
  const docsToDelete: any[] = [];

  for (const d of snapshot.docs) {
    const data = d.data();
    const email = (data.correo || data.email || '').toLowerCase().trim();
    if (email === PRESERVED_EMAIL || d.id === 'essenya222') {
      docsToKeep.push(`${d.id} (${email})`);
    } else {
      docsToDelete.push(d);
    }
  }

  console.log(`  Profiles to keep in '${colName}':`, docsToKeep);
  console.log(`  Profiles to delete in '${colName}': ${docsToDelete.length}`);

  let count = 0;
  while (count < docsToDelete.length) {
    const batch = writeBatch(db);
    const chunk = docsToDelete.slice(count, count + 200);
    
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    
    await batch.commit();
    count += chunk.length;
    console.log(`  Deleted batch of ${chunk.length} docs in '${colName}'. Total deleted: ${count}/${docsToDelete.length}`);
  }
}

async function runClientCleanup() {
  try {
    const app = initializeApp(appletConfig);
    const db = getFirestore(app, appletConfig.firestoreDatabaseId);

    const collectionsToClear = [
      'clientes',
      'terapeutas',
      'terapeutas_publicos',
      'reservas',
      'invoices',
      'pagos',
      'alertas_panico',
      'audit_logs'
    ];

    for (const colName of collectionsToClear) {
      await cleanCollection(db, colName);
    }

    await cleanUsersCollection(db, 'users');
    await cleanUsersCollection(db, 'administradores');
    await cleanUsersCollection(db, 'admins');

    console.log('\n==================================================');
    console.log('CLIENT-SIDE FIRESTORE CLEANUP COMPLETED!');
    console.log('==================================================');

  } catch (err) {
    console.error('Firestore client cleanup failed:', err);
  }
}

runClientCleanup();
