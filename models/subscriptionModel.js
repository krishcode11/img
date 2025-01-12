const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A subscription plan must have a name'],
    unique: true,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'A subscription plan must have a price']
  },
  duration: {
    type: Number,
    required: [true, 'A subscription plan must have a duration in days']
  },
  features: [{
    type: String,
    required: [true, 'A subscription plan must have features']
  }],
  maxNFTs: {
    type: Number,
    required: [true, 'Please specify the maximum number of NFTs allowed']
  },
  commissionRate: {
    type: Number,
    required: [true, 'Please specify the commission rate'],
    min: [0, 'Commission rate cannot be negative'],
    max: [100, 'Commission rate cannot exceed 100%']
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate with users subscribed to this plan
subscriptionSchema.virtual('subscribers', {
  ref: 'User',
  foreignField: 'subscriptionPlan',
  localField: '_id'
});

// Virtual field for monthly price
subscriptionSchema.virtual('monthlyPrice').get(function() {
  return (this.price * 30) / this.duration;
});

// Middleware to check if plan can be deleted
subscriptionSchema.pre('remove', async function(next) {
  const subscriberCount = await mongoose.model('User').countDocuments({ subscriptionPlan: this._id });
  if (subscriberCount > 0) {
    next(new Error('Cannot delete plan with active subscribers'));
  }
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
