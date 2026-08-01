import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic dependency-free environment parser
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const parts = line.split('=');
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    console.log('Adding faculty-01@kgkite.ac.in to Firebase...');
    const userCred = await createUserWithEmailAndPassword(auth, 'faculty-01@kgkite.ac.in', '24faculty@71');
    console.log('Faculty user added successfully! UID:', userCred.user.uid);
  } catch (e) {
    console.error('Error adding faculty user:', e.message);
  }

  try {
    console.log('Adding admin-02@kgkite.ac.in to Firebase...');
    const userCred = await createUserWithEmailAndPassword(auth, 'admin-02@kgkite.ac.in', '24admin@71');
    console.log('Admin user added successfully! UID:', userCred.user.uid);
  } catch (e) {
    console.error('Error adding admin user:', e.message);
  }

  process.exit(0);
}

run();
