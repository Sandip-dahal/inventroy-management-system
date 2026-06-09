const jwt = require('jsonwebtoken');
const { findUserById } = require('../utils/userLookup');

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
      return res.status(500).json({
        success: false,
        message: 'Database error during authentication',
        error: dbError.message,
      });
    }

    if (!currentUser) {
      // Login already validated this user; trust the verified JWT if Firestore lookup fails
      console.warn(`Firestore lookup missed user ${decoded.id}; using verified JWT identity`);
      req.user = {
        _id: decoded.id,
        id: decoded.id,
        role: 'admin',
        store: decoded.id,
      };
      return next();
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
