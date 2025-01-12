// routes/nftsRoute.js
const express = require('express');
const nftControllers = require('../controllers/nftControllers');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/stats', nftControllers.getNFTStats);
router.get('/monthly-plan/:year', nftControllers.getMonthlyPlan);
router.get('/featured', nftControllers.getFeaturedNFTs);
router.get('/top-rated', nftControllers.getTopRatedNFTs);
router.get('/most-viewed', nftControllers.getMostViewedNFTs);
router.get('/recently-listed', nftControllers.getRecentlyListedNFTs);
router.get('/top-expensive', nftControllers.getTopExpensiveNFTs);

// Protect all routes after this middleware
router.use(authController.protect);

// Protected routes
router.route('/')
  .get(nftControllers.getAllNFTs)
  .post(
    authController.restrictTo('admin', 'creator'),
    nftControllers.createNFT
  );

router.route('/:id')
  .get(nftControllers.getSingleNFT)
  .patch(
    authController.restrictTo('admin', 'creator'),
    nftControllers.updateNFT
  )
  .delete(
    authController.restrictTo('admin'),
    nftControllers.deleteNFT
  );

module.exports = router;
