const { db, clientDb, isAdminSdk } = require('../firebase');

async function findUserById(id) {
  if (!id) return null;

  if (isAdminSdk) {
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists) {
      return { id: userDoc.id, ...userDoc.data() };
    }

    const snapshot = await db.collection('users').where('_id', '==', id).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    return null;
  }

  const { doc, getDoc, collection, query, where, limit, getDocs } = require('firebase/firestore');
  const firestore = clientDb || db;
  const userRef = doc(firestore, 'users', id);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }

  const usersRef = collection(firestore, 'users');
  const q = query(usersRef, where('_id', '==', id), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }

  return null;
}

async function findUserByEmail(email) {
  if (!email) return null;

  if (isAdminSdk) {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const { collection, query, where, limit, getDocs } = require('firebase/firestore');
  const firestore = clientDb || db;
  const usersRef = collection(firestore, 'users');
  const q = query(usersRef, where('email', '==', email), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

module.exports = { findUserById, findUserByEmail };
