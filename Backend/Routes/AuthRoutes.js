// authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

/**
 * @route   POST /auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', authController.signup);

/**
 * @route   POST /auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /auth/reset-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/reset-password', authController.requestPasswordReset);

/**
 * @route   POST /auth/confirm-reset
 * @desc    Confirm password reset with token
 * @access  Public
 */
router.post('/confirm-reset', authController.confirmPasswordReset);

/**
 * @route   POST /auth/update-password
 * @desc    Update user password (authenticated)
 * @access  Private
 */
router.post('/update-password', authenticateUser, authController.updatePassword);

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateUser, authController.logout);

/**
 * @route   GET /auth/user
 * @desc    Get current user info
 * @access  Private
 */
router.get('/user', authenticateUser, authController.getCurrentUser);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

module.exports = router;