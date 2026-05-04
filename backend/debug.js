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

async function debug() {
  const users = await db.collection('users').get();
  console.log("USERS:");
  users.docs.forEach(d => console.log(d.data()));

  const tasks = await db.collection('tasks').get();
  console.log("\nTASKS:");
  tasks.docs.forEach(d => console.log(d.data()));
}
debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
