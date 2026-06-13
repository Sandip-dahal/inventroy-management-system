const { findUserById } = require('../utils/userLookup');

const ensureUserExists = async (req, res, next) => {
  try {
    // If user is already set by auth middleware (including fallback)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Optional: Verify user still exists in database
    // But don't throw error if not found - use fallback
    const user = await findUserById(req.user.id);
    
    if (!user) {
      console.warn(`User ${req.user.id} not found in DB, but continuing with cached user data`);
      // Continue anyway - don't block the request
      return next();
    }

    // Attach full user data to request if needed
    req.userData = user;
    next();
  } catch (error) {
    console.error('Error in ensureUserExists middleware:', error);
    // Don't block the request on error
    next();
  }
};

module.exports = ensureUserExists;