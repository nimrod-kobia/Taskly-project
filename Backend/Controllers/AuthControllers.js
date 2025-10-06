// controllers/authController.js
const supabase = require('../config/supabase');

/**
 * Sign up a new user
 * @route POST /auth/signup
 */
const signup = async (req, res) => {
  try {
    const { email, password, fullName, metadata } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Sign up user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
          ...metadata
        }
      }
    });

    if (error) {
      return res.status(400).json({ 
        error: 'Sign up failed',
        message: error.message
      });
    }

    // Check if email confirmation is required
    const emailConfirmationRequired = !data.session;

    res.status(201).json({
      success: true,
      message: emailConfirmationRequired 
        ? 'Sign up successful. Please check your email to confirm your account.'
        : 'Sign up successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name
      },
      session: data.session,
      emailConfirmationRequired
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during sign up'
    });
  }
};

/**
 * Log in an existing user
 * @route POST /auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ 
        error: 'Login failed',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
        emailVerified: data.user.email_confirmed_at !== null
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during login'
    });
  }
};

/**
 * Request password reset email
 * @route POST /auth/reset-password
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ 
        error: 'Missing email',
        message: 'Email is required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({ 
        error: 'Password reset failed',
        message: error.message
      });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while requesting password reset'
    });
  }
};

/**
 * Update user password (requires authentication)
 * @route POST /auth/update-password
 */
const updatePassword = async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body;

    // Validate new password
    if (!newPassword) {
      return res.status(400).json({ 
        error: 'Missing password',
        message: 'New password is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // If current password is provided, verify it first
    if (currentPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      });

      if (verifyError) {
        return res.status(401).json({ 
          error: 'Invalid current password',
          message: 'The current password you provided is incorrect'
        });
      }
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ 
        error: 'Password update failed',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while updating password'
    });
  }
};

/**
 * Confirm password reset with token
 * @route POST /auth/confirm-reset
 */
const confirmPasswordReset = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify token and update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ 
        error: 'Password reset failed',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while resetting password'
    });
  }
};

/**
 * Log out user (requires authentication)
 * @route POST /auth/logout
 */
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ 
        error: 'Logout failed',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during logout'
    });
  }
};

/**
 * Get current user info (requires authentication)
 * @route GET /auth/user
 */
const getCurrentUser = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.user_metadata?.full_name,
        emailVerified: req.user.email_confirmed_at !== null,
        createdAt: req.user.created_at,
        lastSignIn: req.user.last_sign_in_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while fetching user data'
    });
  }
};

/**
 * Refresh access token
 * @route POST /auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ 
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({ 
        error: 'Token refresh failed',
        message: error.message
      });
    }

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred while refreshing token'
    });
  }
};

module.exports = {
  signup,
  login,
  requestPasswordReset,
  updatePassword,
  confirmPasswordReset,
  logout,
  getCurrentUser,
  refreshToken
};