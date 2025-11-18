// authUtils.js
const supabase = require('../config/supabase');

/**
 * Verify if a token is valid
 */
const verifyToken = async (token) => { 
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { valid: false, user: null };
    }
    
    return { valid: true, user };
  } catch (error) {
    return { valid: false, user: null };
  }
};

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split('Bearer ')[1];
};

/**
 * Check if user email is verified
 */
const isEmailVerified = (user) => {
  return user && user.email_confirmed_at !== null;
};

/**
 * Calculate password strength
 */
const calculatePasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  
  const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  
  return {
    score: strength,
    level: strengthLevels[Math.min(strength, strengthLevels.length - 1)]
  };
};

/**
 * Generate a random token (for custom implementations)
 */
const generateRandomToken = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
};

/**
 * Sanitize user object (remove sensitive data)
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name,
    emailVerified: user.email_confirmed_at !== null,
    createdAt: user.created_at,
    lastSignIn: user.last_sign_in_at
  };
};

/**
 * Check if session is expired
 */
const isSessionExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return new Date(expiresAt * 1000) < new Date();
};

/**
 * Format auth error messages for user-friendly display
 */
const formatAuthError = (error) => {
  const errorMessages = {
    'Invalid login credentials': 'The email or password you entered is incorrect',
    'Email not confirmed': 'Please verify your email address before logging in',
    'User already registered': 'An account with this email already exists',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long',
    'Invalid email': 'Please enter a valid email address'
  };
  
  return errorMessages[error] || error;
};

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitStore = new Map();

const checkRateLimit = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const attempts = rateLimitStore.get(identifier) || [];
  
  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const resetTime = new Date(oldestAttempt + windowMs);
    
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime
    };
  }
  
  // Add current attempt
  recentAttempts.push(now);
  rateLimitStore.set(identifier, recentAttempts);
  
  return {
    allowed: true,
    remainingAttempts: maxAttempts - recentAttempts.length,
    resetTime: null
  };
};

/**
 * Clear rate limit for an identifier
 */
const clearRateLimit = (identifier) => {
  rateLimitStore.delete(identifier);
};

module.exports = {
  verifyToken,
  extractToken,
  isEmailVerified,
  calculatePasswordStrength,
  generateRandomToken,
  sanitizeUser,
  isSessionExpired,
  formatAuthError,
  checkRateLimit,
  clearRateLimit
};
