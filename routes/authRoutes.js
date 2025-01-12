const express = require('express');
const authController = require('./../controllers/authController');

const router = express.Router();

console.log('Setting up auth routes...');

// Debug middleware
router.use((req, res, next) => {
  console.log('Auth route middleware:', req.method, req.path);
  next();
});

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protected routes
router.use(authController.protect); // Protect all routes after this middleware
router.patch('/updatePassword', authController.updatePassword);

module.exports = router;
