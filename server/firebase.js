const admin = require('firebase-admin');
const { createCompatDb } = require('./firestoreCompat');
const fs = require('fs');
const path = require('path');

function getServiceAccount() {
  // First, try to load from JSON file (MOST RELIABLE)
  try {
    const jsonPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(jsonPath)) {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      const serviceAccount = JSON.parse(fileContent);
      console.log('✅ Firebase service account loaded from file');
      return serviceAccount;
    }
  } catch (fileError) {
    console.warn('Could not load firebase-service-account.json:', fileError.message);
  }

  // Second, try environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✅ Firebase service account loaded from env');
      return serviceAccount;
    } catch (parseError) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT:', parseError.message);
    }
  }

  // Third, try individual environment variables
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('✅ Firebase service account loaded from individual env vars');
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

function initClientSdk() {
  const { initializeApp } = require('firebase/app');
  const { getFirestore } = require('firebase/firestore');

  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  return getFirestore(app);
}

const serviceAccount = getServiceAccount();
let db;
let clientDb = null;
let isAdminSdk = false;

if (serviceAccount) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('✅ Firebase Admin SDK initialized');
  }
  db = admin.firestore();
  isAdminSdk = true;
  
  // Test the connection
  db.collection('users').limit(1).get()
    .then(() => console.log('✅ Firestore connection successful'))
    .catch(err => console.error('❌ Firestore connection failed:', err.message));
} else {
  console.warn(
    'Firebase Admin credentials not found. Using client SDK with Admin-compatible wrapper. ' +
    'For best reliability on Render, set up firebase-service-account.json or ' +
    'FIREBASE_SERVICE_ACCOUNT environment variable.'
  );
  clientDb = initClientSdk();
  db = createCompatDb(clientDb);
}

module.exports = { db, clientDb, isAdminSdk };