const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/', subscriptionController.getAllPlans);
router.get('/monthly', subscriptionController.getMonthlyPlans);
router.get('/stats', subscriptionController.getPlanStats);
router.get('/:id', subscriptionController.getPlan);

// Protect all routes after this middleware
router.use(authController.protect);

// Subscribe/unsubscribe routes (protected)
router.post('/:planId/subscribe', subscriptionController.subscribeToPlan);
router.post('/cancel', subscriptionController.cancelSubscription);

// Admin only routes
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .post(subscriptionController.createPlan);

router
  .route('/:id')
  .patch(subscriptionController.updatePlan)
  .delete(subscriptionController.deletePlan);

module.exports = router;
