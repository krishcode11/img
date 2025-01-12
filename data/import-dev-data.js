const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const NFT = require('../models/nftmodel');

// Load environment variables from the correct path
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE;

mongoose.connect(DB).then(() => {
  console.log('DB connection successful!');
});

// READ JSON FILE
const nfts = JSON.parse(
  fs.readFileSync(`${__dirname}/nfts.json`, 'utf-8')
);

// IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    // Transform the data to match our new schema
    const transformedNFTs = nfts.map((nft, index) => ({
      name: nft.name || `Cool NFT #${index + 1}`,
      price: nft.price || Math.floor(Math.random() * 10000) + 100, // Random price between 100 and 10100
      description: nft.description || nft.summary || 'A unique digital collectible',
      imageCover: nft.imageCover || 'default-nft-cover.jpg',
      images: nft.images || [],
      category: ['art', 'music', 'video', 'collectible', 'other'][Math.floor(Math.random() * 5)],
      status: 'listed',
      views: Math.floor(Math.random() * 1000), // Random views between 0 and 1000
      featured: index < 5, // First 5 NFTs are featured
      ratingsAverage: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
      ratingsQuantity: Math.floor(Math.random() * 100), // Random number of ratings between 0 and 100
      owner: `0x${Math.random().toString(16).substr(2, 40)}` // Random ethereum-like address
    }));

    await NFT.deleteMany(); // Clear existing data
    await NFT.create(transformedNFTs);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM COLLECTION
const deleteData = async () => {
  try {
    await NFT.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
