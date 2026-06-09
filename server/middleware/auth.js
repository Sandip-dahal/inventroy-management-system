const jwt = require('jsonwebtoken');
const { db, isAdminSdk } = require('../firebase');

const findUserById = async (id) => {
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

  const { doc, collection, query, where, limit, getDoc, getDocs } = require('firebase/firestore');
  const userRef = doc(db, 'users', id);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('_id', '==', id), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }

  return null;
};

const auth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in! Please log in to access.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure. Please log in again.',
      });
    }

    let currentUser = null;

    try {
      currentUser = await findUserById(decoded.id);
    } catch (dbError) {
      console.error('Firestore error in auth middleware:', dbError);
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = {
      _id: currentUser.id,
      id: currentUser.id,
      role: currentUser.role || 'user',
      store: currentUser.store || currentUser.id,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your token has expired. Please log in again.',
      });
    }

    console.error('Auth middleware error:', err);
    res.status(401).json({
      success: false,
      message: 'Authentication failed. Please log in again.',
    });
  }
};

module.exports = auth;
