const Subscription = require('../models/subscriptionModel');
const User = require('../models/userModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all active plans
exports.getAllPlans = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Subscription.find({ active: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const plans = await features.query;
  const totalPlans = await Subscription.countDocuments({ active: true });

  res.status(200).json({
    status: 'success',
    results: plans.length,
    total: totalPlans,
    data: { plans }
  });
});

// Get monthly plans
exports.getMonthlyPlans = catchAsync(async (req, res, next) => {
  const plans = await Subscription.find({
    active: true
  }).sort('monthlyPrice');

  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: { plans }
  });
});

// Get plan stats
exports.getPlanStats = catchAsync(async (req, res, next) => {
  const stats = await Subscription.aggregate([
    {
      $match: { active: true }
    },
    {
      $group: {
        _id: null,
        numPlans: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        totalSubscribers: { $sum: '$subscriberCount' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// Get a specific plan
exports.getPlan = catchAsync(async (req, res, next) => {
  const plan = await Subscription.findById(req.params.id)
    .populate({
      path: 'subscribers',
      select: 'name email walletAddress'
    });

  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { plan }
  });
});

// Create a new plan (admin only)
exports.createPlan = catchAsync(async (req, res, next) => {
  const newPlan = await Subscription.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { plan: newPlan }
  });
});

// Update a plan (admin only)
exports.updatePlan = catchAsync(async (req, res, next) => {
  const plan = await Subscription.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { plan }
  });
});

// Delete a plan (admin only)
exports.deletePlan = catchAsync(async (req, res, next) => {
  const plan = await Subscription.findById(req.params.id);

  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }

  // Check if plan has active subscribers
  if (plan.subscriberCount > 0) {
    return next(new AppError('Cannot delete plan with active subscribers', 400));
  }

  await Subscription.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Subscribe to a plan
exports.subscribeToPlan = catchAsync(async (req, res, next) => {
  const plan = await Subscription.findById(req.params.planId);
  const user = await User.findById(req.user.id);

  if (!plan) {
    return next(new AppError('No subscription plan found with that ID', 404));
  }

  if (!plan.active) {
    return next(new AppError('This plan is no longer active', 400));
  }

  // Check if user already has an active subscription
  if (user.activePlan) {
    return next(new AppError('You already have an active subscription', 400));
  }

  // Update user's subscription
  user.subscriptionPlan = plan._id;
  user.subscriptionStartDate = Date.now();
  user.subscriptionEndDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Successfully subscribed to plan',
    data: {
      plan,
      user: {
        name: user.name,
        email: user.email,
        subscriptionEndDate: user.subscriptionEndDate
      }
    }
  });
});

// Cancel subscription
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user.subscriptionPlan) {
    return next(new AppError('You do not have an active subscription', 400));
  }

  user.subscriptionPlan = undefined;
  user.subscriptionStartDate = undefined;
  user.subscriptionEndDate = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Subscription cancelled successfully'
  });
});
