// authValidator.js

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password.length > 72) {
    errors.push('Password must be less than 72 characters');
  }

  // Optional: Add more strength requirements
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Uncomment for stricter password requirements
  // if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
  // if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
  // if (!hasNumbers) errors.push('Password must contain at least one number');
  // if (!hasSpecialChar) errors.push('Password must contain at least one special character');

  return {
    isValid: errors.length === 0,
    errors,
    strength: {
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};

/**
 * Validate signup data
 */
const validateSignup = (req, res, next) => {
  const { email, password, fullName } = req.body;
  const errors = [];

  // Validate email
  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  // Validate full name (optional but if provided, must be valid)
  if (fullName && fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      messages: errors
    });
  }

  next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email is required');
  } else if (!validateEmail(email)) {
    errors.push('Invalid email format');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      messages: errors
    });
  }

  next();
};

/**
 * Validate password reset request
 */
const validatePasswordReset = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Validation failed',
      messages: ['Email is required']
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      error: 'Validation failed',
      messages: ['Invalid email format']
    });
  }

  next();
};

/**
 * Validate password update
 */
const validatePasswordUpdate = (req, res, next) => {
  const { newPassword } = req.body;
  
  const passwordValidation = validatePassword(newPassword);
  
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      messages: passwordValidation.errors
    });
  }

  next();
};

module.exports = {
  validateEmail,
  validatePassword,
  validateSignup,
  validateLogin,
  validatePasswordReset,
  validatePasswordUpdate
};