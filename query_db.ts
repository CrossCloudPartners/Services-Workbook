import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log("Users:");
  usersSnap.forEach(doc => {
    console.log(doc.id, doc.data().email, doc.data().photoURL);
  });
  
  const pubSnap = await getDocs(collection(db, 'public_profiles'));
  console.log("\nPublic Profiles:");
  pubSnap.forEach(doc => {
    console.log(doc.id, doc.data().photoURL);
  });
  
  process.exit(0);
}
check().catch(console.error);
