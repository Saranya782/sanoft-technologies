const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  })
});

const db = admin.firestore();

async function fix() {
  const orgs = await db.collection('organizations').limit(1).get();
  if (orgs.empty) return console.log('No organizations found in database.');
  const orgId = orgs.docs[0].id;

  const users = await db.collection('users').get();
  let updatedCount = 0;
  for (const doc of users.docs) {
    if (!doc.data().orgId) {
      await doc.ref.update({ orgId });
      console.log(`Linked user ${doc.data().email} to organization ${orgId}`);
      updatedCount++;
    }
  }
  console.log(`Finished. Updated ${updatedCount} users.`);
}
fix().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
