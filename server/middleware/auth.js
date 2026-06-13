const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('No token provided');
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

    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully. User ID:', decoded.id);

    if (!decoded || !decoded.id) {
      console.log('Token missing id field');
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure. Please log in again.',
      });
    }

    // COMPLETELY SKIP DATABASE LOOKUP - Use token data directly
    console.log('✅ Using token data directly (SKIPPING Firestore lookup)');
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      role: 'admin',
      store: decoded.id,
    };
    
    console.log('✅ Auth successful for user:', req.user.id);
    next();
    
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      console.error('JWT Error:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }

    if (err.name === 'TokenExpiredError') {
      console.error('Token expired');
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