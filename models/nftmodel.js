const mongoose = require("mongoose");
const slugify = require('slugify');
const validator = require('validator');
const crypto = require('crypto');

const nftSchema = new mongoose.Schema({
  uniqueIdentifier: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return crypto.randomBytes(16).toString('hex');
    }
  },
  name: {
    type: String,
    required: [true, "NFT must have a name"],
    unique: true,
    trim: true,
    maxlength: [100, "Name cannot be more than 100 characters"],
    minlength: [3, "Name must be at least 3 characters"],
    validate: {
      validator: function(val) {
        return validator.isAlphanumeric(val.replace(/\s/g, ''));
      },
      message: 'NFT name can only contain letters, numbers and spaces'
    }
  },
  slug: String,
  description: {
    type: String,
    required: [true, "NFT must have a description"],
    trim: true,
    maxlength: [500, "Description cannot be more than 500 characters"]
  },
  price: {
    type: Number,
    required: [true, "NFT must have a price"],
    min: [0, "Price cannot be negative"],
    validate: {
      validator: function(val) {
        // Price must be up to 2 decimal places
        return Number.isFinite(val) && val.toString().match(/^\d+(\.\d{1,2})?$/);
      },
      message: 'Price must be a number with up to 2 decimal places'
    }
  },
  priceHistory: [{
    price: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  category: {
    type: String,
    required: [true, "NFT must belong to a category"],
    enum: {
      values: ['art', 'music', 'video', 'collectible', 'gaming', 'meme', 'other'],
      message: 'Category is either: art, music, video, collectible, gaming, meme, or other'
    }
  },
  creator: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'NFT must belong to a creator']
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'NFT must have an owner']
  },
  status: {
    type: String,
    enum: ['listed', 'unlisted', 'sold', 'secret'],
    default: 'unlisted'
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  secretKey: {
    type: String,
    select: false,
    default: function() {
      if (this.isSecret) {
        return crypto.randomBytes(32).toString('hex');
      }
      return undefined;
    }
  },
  secretHash: {
    type: String,
    select: false,
    default: function() {
      if (this.isSecret && this.secretKey) {
        return crypto
          .createHash('sha256')
          .update(this.secretKey)
          .digest('hex');
      }
      return undefined;
    }
  },
  tokenId: {
    type: String,
    required: [true, 'NFT must have a token ID'],
    unique: true,
    validate: {
      validator: function(val) {
        return validator.isAlphanumeric(val);
      },
      message: 'Token ID must be alphanumeric'
    }
  },
  contractAddress: {
    type: String,
    required: [true, 'NFT must have a contract address'],
    validate: {
      validator: function(val) {
        return validator.isEthereumAddress(val);
      },
      message: 'Invalid Ethereum address'
    }
  },
  blockchain: {
    type: String,
    required: [true, 'NFT must specify blockchain'],
    enum: ['Ethereum', 'Polygon', 'Binance', 'Solana']
  },
  metadata: {
    type: Map,
    of: String,
    validate: {
      validator: function(val) {
        // Ensure metadata size doesn't exceed 100KB
        return JSON.stringify(val).length <= 102400;
      },
      message: 'Metadata size exceeds 100KB limit'
    }
  },
  image: {
    type: String,
    required: [true, 'NFT must have an image'],
    validate: {
      validator: function(val) {
        return validator.isURL(val);
      },
      message: 'Invalid image URL'
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: val => Math.round(val * 10) / 10
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Ratings quantity cannot be negative']
  },
  tags: [{
    type: String,
    validate: {
      validator: function(val) {
        return val.length >= 2 && val.length <= 20;
      },
      message: 'Tag must be between 2 and 20 characters'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  },
  lastModified: {
    type: Date,
    default: Date.now()
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Indexes
nftSchema.index({ price: 1, ratingsAverage: -1 });
nftSchema.index({ slug: 1 });
nftSchema.index({ category: 1 });
nftSchema.index({ owner: 1 });
nftSchema.index({ creator: 1 });
nftSchema.index({ status: 1 });
nftSchema.index({ tags: 1 });
nftSchema.index({ isSecret: 1 });

// Virtual Fields
nftSchema.virtual('priceUSD').get(function() {
  const ethToUSD = 2500; // In production, use real exchange rate
  return this.price * ethToUSD;
});

nftSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

nftSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'nft',
  localField: '_id'
});

// Document Middleware
nftSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

nftSchema.pre('save', function(next) {
  if (this.isModified('price')) {
    this.priceHistory.push({
      price: this.price,
      date: Date.now()
    });
  }
  this.lastModified = Date.now();
  next();
});

nftSchema.pre('save', function(next) {
  if (this.isSecret && !this.secretKey) {
    this.secretKey = crypto.randomBytes(32).toString('hex');
    this.secretHash = crypto
      .createHash('sha256')
      .update(this.secretKey)
      .digest('hex');
  }
  next();
});

// Query Middleware
nftSchema.pre(/^find/, function(next) {
  // Skip middleware for admin routes
  if (this._conditions.showAll) {
    delete this._conditions.showAll;
    return next();
  }

  // Exclude secret NFTs unless explicitly requested
  if (!this._conditions.isSecret) {
    this.find({ isSecret: { $ne: true } });
  }
  next();
});

nftSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'creator',
    select: 'name photo'
  }).populate({
    path: 'owner',
    select: 'name photo'
  });
  next();
});

// Aggregation Middleware
nftSchema.pre('aggregate', function(next) {
  // Add match stage at beginning of pipeline
  this.pipeline().unshift({ 
    $match: { 
      status: { $ne: 'deleted' },
      isSecret: { $ne: true }
    } 
  });
  next();
});

// Instance Methods
nftSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save({ validateBeforeSave: false });
};

nftSchema.methods.calculatePriceChange = function() {
  if (this.priceHistory.length < 2) return 0;
  const currentPrice = this.price;
  const initialPrice = this.priceHistory[0].price;
  return ((currentPrice - initialPrice) / initialPrice) * 100;
};

nftSchema.methods.verifySecretKey = function(candidateKey) {
  if (!this.secretHash) return true;
  
  const hash = crypto
    .createHash('sha256')
    .update(candidateKey)
    .digest('hex');
    
  return this.secretHash === hash;
};

// Static Methods
nftSchema.statics.getTopStats = async function() {
  const stats = await this.aggregate([
    {
      $facet: {
        byCategory: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              avgPrice: { $avg: '$price' },
              totalValue: { $sum: '$price' },
              avgRating: { $avg: '$ratingsAverage' },
              totalViews: { $sum: '$views' }
            }
          },
          { $sort: { count: -1 } }
        ],
        byPrice: [
          { $sort: { price: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              name: 1,
              price: 1,
              category: 1
            }
          }
        ],
        byRating: [
          { $sort: { ratingsAverage: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              name: 1,
              ratingsAverage: 1,
              ratingsQuantity: 1
            }
          }
        ],
        byViews: [
          { $sort: { views: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              name: 1,
              views: 1
            }
          }
        ],
        overall: [
          {
            $group: {
              _id: null,
              totalNFTs: { $sum: 1 },
              avgPrice: { $avg: '$price' },
              totalValue: { $sum: '$price' },
              avgRating: { $avg: '$ratingsAverage' },
              totalViews: { $sum: '$views' }
            }
          }
        ]
      }
    }
  ]);
  
  return stats[0];
};

const NFT = mongoose.model("NFT", nftSchema);
module.exports = NFT;