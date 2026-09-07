import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import appletConfig from '../firebase-applet-config.json' with { type: 'json' };

const projectId = appletConfig.projectId;
const databaseId = appletConfig.firestoreDatabaseId;

const PRESERVED_EMAIL = 'essenya222@gmail.com';

console.log('==================================================');
console.log('ESSENYA - ADMINISTRATIVE DATA CLEANUP UTILITY');
console.log('==================================================');
console.log(`Project ID: ${projectId}`);
console.log(`Database ID: ${databaseId}`);
console.log(`Preserved Email: ${PRESERVED_EMAIL}`);
console.log('--------------------------------------------------');

async function runCleanup() {
  try {
    // 1. Initialize Firebase Admin SDK
    initializeApp({
      projectId: projectId,
    });

    const db = getFirestore(databaseId);
    const auth = getAuth();

    console.log('\n[1/3] Fetching Firebase Auth Users for cleanup...');
    const usersToDelete: string[] = [];
    const emailsToDelete: string[] = [];
    let preservedUserUid = '';

    // List all users in Firebase Auth
    let nextPageToken: string | undefined = undefined;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      for (const userRecord of listUsersResult.users) {
        const email = userRecord.email?.toLowerCase() || '';
        if (email === PRESERVED_EMAIL) {
          preservedUserUid = userRecord.uid;
          console.log(`* Preserved Owner Auth User: UID: ${userRecord.uid} | Email: ${userRecord.email}`);
        } else {
          usersToDelete.push(userRecord.uid);
          emailsToDelete.push(email || '(no email)');
        }
      }
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`\nIdentified ${usersToDelete.length} demo/test auth accounts to delete:`);
    emailsToDelete.forEach((email, idx) => {
      console.log(`  - UID: ${usersToDelete[idx]} | Email: ${email}`);
    });

    // Delete Auth Users
    if (usersToDelete.length > 0) {
      console.log(`\nDeleting ${usersToDelete.length} auth users from Firebase Auth...`);
      const deleteResult = await auth.deleteUsers(usersToDelete);
      console.log(`Successfully deleted ${deleteResult.successCount} users.`);
      if (deleteResult.failureCount > 0) {
        console.warn(`Failed to delete ${deleteResult.failureCount} users.`);
        deleteResult.errors.forEach(err => {
          console.warn(`  Error on index ${err.index}: ${err.error.message}`);
        });
      }
    } else {
      console.log('\nNo auth users to delete.');
    }

    // 2. Clear Firestore Collections
    console.log('\n[2/3] Cleaning up Firestore transactional and demo collections...');

    // A. Collections to delete ENTIRELY
    const collectionsToClear = [
      'clientes',
      'terapeutas',
      'terapeutas_publicos',
      'reservas',
      'invoices',
      'alertas_panico',
      'audit_logs'
    ];

    for (const colName of collectionsToClear) {
      console.log(`  Clearing collection: '${colName}'...`);
      const colRef = db.collection(colName);
      const snapshot = await colRef.get();
      
      if (snapshot.empty) {
        console.log(`    Collection '${colName}' is already empty.`);
        continue;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`    Deleted ${snapshot.size} documents from '${colName}'.`);
    }

    // B. Clean 'users' collection while preserving the master owner
    console.log(`  Clearing collection: 'users' (preserving ${PRESERVED_EMAIL})...`);
    const usersCol = db.collection('users');
    const usersSnapshot = await usersCol.get();
    let deletedUsersCount = 0;

    const usersBatch = db.batch();
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = (data.correo || data.email || '').toLowerCase().trim();
      
      if (email === PRESERVED_EMAIL || doc.id === preservedUserUid) {
        console.log(`    * Preserving user profile doc: ID: ${doc.id} | Email: ${email}`);
      } else {
        usersBatch.delete(doc.ref);
        deletedUsersCount++;
      }
    });

    if (deletedUsersCount > 0) {
      await usersBatch.commit();
      console.log(`    Deleted ${deletedUsersCount} documents from 'users'.`);
    } else {
      console.log('    No demo user profile documents to delete in \'users\'.');
    }

    // C. Clean 'administradores' collection while preserving the master owner
    console.log(`  Clearing collection: 'administradores' (preserving ${PRESERVED_EMAIL})...`);
    const adminsCol = db.collection('administradores');
    const adminsSnapshot = await adminsCol.get();
    let deletedAdminsCount = 0;

    const adminsBatch = db.batch();
    adminsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = (data.correo || data.email || '').toLowerCase().trim();
      
      if (email === PRESERVED_EMAIL || doc.id === preservedUserUid) {
        console.log(`    * Preserving admin profile doc: ID: ${doc.id} | Email: ${email}`);
      } else {
        adminsBatch.delete(doc.ref);
        deletedAdminsCount++;
      }
    });

    if (deletedAdminsCount > 0) {
      await adminsBatch.commit();
      console.log(`    Deleted ${deletedAdminsCount} documents from 'administradores'.`);
    } else {
      console.log('    No demo admin documents to delete in \'administradores\'.');
    }

    console.log('\n[3/3] Cleanup process completed successfully.');
    console.log('==================================================');
    console.log('ESSENYA IS NOW IN AN INITIAL STATE FOR REAL TESTS!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('\n[ERROR] Cleanup failed:', err);
    console.log('\n* NOTE: If you are running this script locally, make sure you have appropriate Google Cloud permissions');
    console.log('  or run the endpoint /api/admin/clean-demo-data in the Cloud Run deployed instance.');
    console.log('==================================================');
  }
}

runCleanup();
