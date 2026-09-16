import * as adminApp from "firebase-admin/app";
import * as adminFirestore from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function wipeData() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let projectId = "essenya-ecosistema";
  let firestoreDatabaseId: string | undefined = undefined;

  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (parsed.projectId) projectId = parsed.projectId;
      if (parsed.firestoreDatabaseId) firestoreDatabaseId = parsed.firestoreDatabaseId;
      console.log(`Config found: Project=${projectId}, DB=${firestoreDatabaseId}`);
    } catch (e) {
      console.warn("Failed to parse firebase config:", e);
    }
  }

  const envProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID || projectId;
  console.log(`Using Project ID: ${envProjectId}`);

  // Try to initialize without explicit credential if in environment, 
  // but ensure project ID is correct.
  adminApp.initializeApp({ 
    projectId: envProjectId 
  });
  
  const db = firestoreDatabaseId 
    ? adminFirestore.getFirestore(adminApp.getApp(), firestoreDatabaseId)
    : adminFirestore.getFirestore();

  console.log(`Firestore initialized for DB: ${firestoreDatabaseId || '(default)'}`);
  
  // Test access
  try {
    await db.collection("reservas").limit(1).get();
    console.log("Conexión a Firestore exitosa.");
  } catch (e) {
    console.error("Error al probar conexión a Firestore:", e);
    throw e;
  }

  // 1. Borrar todas las reservas
  const bookingsSnap = await db.collection("reservas").get();
  console.log(`Borrando ${bookingsSnap.size} reservas...`);
  const bBatch = db.batch();
  bookingsSnap.docs.forEach(doc => bBatch.delete(doc.ref));
  await bBatch.commit();

  // 2. Borrar todas las facturas
  const invoicesSnap = await db.collection("invoices").get();
  console.log(`Borrando ${invoicesSnap.size} facturas...`);
  const iBatch = db.batch();
  invoicesSnap.docs.forEach(doc => iBatch.delete(doc.ref));
  await iBatch.commit();

  // 3. Borrar alertas de pánico y logs
  const panicSnap = await db.collection("alertas_panico").get();
  const logsSnap = await db.collection("audit_logs").get();
  console.log(`Borrando ${panicSnap.size} alertas y ${logsSnap.size} logs...`);
  const pBatch = db.batch();
  panicSnap.docs.forEach(doc => pBatch.delete(doc.ref));
  logsSnap.docs.forEach(doc => pBatch.delete(doc.ref));
  await pBatch.commit();

  // 4. Clientes específicos
  const clientsSnap = await db.collection("clientes").get();
  console.log(`Procesando ${clientsSnap.size} clientes...`);
  for (const cDoc of clientsSnap.docs) {
    const data = cDoc.data();
    const name = (data.name || data.nombre || "").toLowerCase();
    
    if (name.includes("nelson cárdenas")) {
      console.log(`Reseteando estadísticas para Nelson Cárdenas (ID: ${cDoc.id})`);
      await cDoc.ref.update({
        totalBookings: 0,
        spentTotal: 0,
        rewardsPoints: 0,
        membershipTier: "Platino",
        history: []
      });
    } else if (name.includes("nelson riaño") || name.includes("socio vip") || name.includes("prueba")) {
      console.log(`Eliminando cliente de prueba: ${name} (ID: ${cDoc.id})`);
      await cDoc.ref.delete();
    }
  }

  // 5. Terapeutas específicos
  const therapistsSnap = await db.collection("terapeutas_publicos").get();
  console.log(`Procesando ${therapistsSnap.size} terapeutas públicos...`);
  for (const tDoc of therapistsSnap.docs) {
    const data = tDoc.data();
    const name = (data.name || data.nombre || "").toLowerCase();
    const shouldPreserve = name.includes("jesús maría riaño") || name.includes("martha lucia gomez") || name.includes("elena rostova");
    
    if (!shouldPreserve) {
      console.log(`Eliminando terapeuta de prueba: ${name} (ID: ${tDoc.id})`);
      await tDoc.ref.delete();
    }
  }

  console.log('--- Limpieza de Datos Completada ---');
}

wipeData().catch(err => {
  console.error("Error crítico durante la limpieza:", err);
  process.exit(1);
});
