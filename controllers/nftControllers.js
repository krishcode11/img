const NFT = require('../models/nftmodel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all NFTs
const getAllNFTs = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(NFT.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const nfts = await features.query;
  const paginationInfo = await features.getTotalCount();

  res.status(200).json({
    status: 'success',
    results: nfts.length,
    pagination: paginationInfo,
    data: { nfts }
  });
});

// Get NFT Stats
const getNFTStats = catchAsync(async (req, res, next) => {
  const stats = await NFT.aggregate([
    {
      $match: { status: 'listed' }
    },
    {
      $group: {
        _id: '$category',
        numNFTs: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        totalValue: { $sum: '$price' }
      }
    },
    {
      $sort: { avgPrice: -1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// Get Monthly Plan
const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = parseInt(req.params.year);

  const plan = await NFT.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        numNFTsCreated: { $sum: 1 },
        nfts: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { month: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan }
  });
});

// Get Featured NFTs
const getFeaturedNFTs = catchAsync(async (req, res, next) => {
  const nfts = await NFT.find({ featured: true })
    .limit(5)
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: nfts.length,
    data: { nfts }
  });
});

// Get Top Rated NFTs
const getTopRatedNFTs = catchAsync(async (req, res, next) => {
  const nfts = await NFT.find()
    .sort('-ratingsAverage -ratingsQuantity')
    .limit(5);

  res.status(200).json({
    status: 'success',
    results: nfts.length,
    data: { nfts }
  });
});

// Get Most Viewed NFTs
const getMostViewedNFTs = catchAsync(async (req, res, next) => {
  const nfts = await NFT.find()
    .sort('-views')
    .limit(5);

  res.status(200).json({
    status: 'success',
    results: nfts.length,
    data: { nfts }
  });
});

// Get Recently Listed NFTs
const getRecentlyListedNFTs = catchAsync(async (req, res, next) => {
  const nfts = await NFT.find({ status: 'listed' })
    .sort('-createdAt')
    .limit(5);

  res.status(200).json({
    status: 'success',
    results: nfts.length,
    data: { nfts }
  });
});

// Get Top Expensive NFTs
const getTopExpensiveNFTs = catchAsync(async (req, res, next) => {
  const nfts = await NFT.find()
    .sort('-price')
    .limit(5);

  res.status(200).json({
    status: 'success',
    results: nfts.length,
    data: { nfts }
  });
});

// Create NFT
const createNFT = catchAsync(async (req, res, next) => {
  // Add creator info
  req.body.creator = req.user.id;
  
  const newNFT = await NFT.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: { nft: newNFT }
  });
});

// Get Single NFT
const getSingleNFT = catchAsync(async (req, res, next) => {
  const nft = await NFT.findById(req.params.id).populate('creator');
  
  if (!nft) {
    return next(new AppError('No NFT found with that ID', 404));
  }

  // Increment views
  await NFT.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  res.status(200).json({
    status: 'success',
    data: { nft }
  });
});

// Update NFT
const updateNFT = catchAsync(async (req, res, next) => {
  const nft = await NFT.findById(req.params.id);
  
  if (!nft) {
    return next(new AppError('No NFT found with that ID', 404));
  }

  // Check if user is creator or admin
  if (nft.creator.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const updatedNFT = await NFT.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { nft: updatedNFT }
  });
});

// Delete NFT
const deleteNFT = catchAsync(async (req, res, next) => {
  const nft = await NFT.findById(req.params.id);
  
  if (!nft) {
    return next(new AppError('No NFT found with that ID', 404));
  }

  // Only admin can delete NFTs
  if (req.user.role !== 'admin') {
    return next(new AppError('Only administrators can delete NFTs', 403));
  }

  await NFT.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  getAllNFTs,
  getNFTStats,
  getMonthlyPlan,
  getFeaturedNFTs,
  getTopRatedNFTs,
  getMostViewedNFTs,
  getRecentlyListedNFTs,
  getTopExpensiveNFTs,
  createNFT,
  getSingleNFT,
  updateNFT,
  deleteNFT
};
