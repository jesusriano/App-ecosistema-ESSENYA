import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let projectId = "essenya-ecosistema";
if (fs.existsSync(configPath)) {
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (parsed.projectId) projectId = parsed.projectId;
}

initializeApp({ projectId });
const db = getFirestore();

async function run() {
  const collections = await db.listCollections();
  console.log("Collections:", collections.map(c => c.id).join(", "));
  
  // Delete debug_cond collections
  for (const c of collections) {
    if (c.id.startsWith("debug_cond")) {
      console.log(`Deleting collection: ${c.id}`);
      const docs = await c.listDocuments();
      for (const doc of docs) {
        await doc.delete();
      }
    }
  }
}
run().catch(console.error);
