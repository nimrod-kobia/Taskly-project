// middleware/auth.js
const supabase = require('../config/supabase');

/**
 * Middleware to authenticate user using JWT token
 * Expects Authorization header with Bearer token
 */
const authenticateUser = async (req, res, next) => { 
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) { 
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: error.message
      });
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'Invalid or expired token'
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but continues even if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateUser,
  optionalAuth
};
