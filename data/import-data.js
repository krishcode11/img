const fs = require("fs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const NFT = require("../models/nftmodel");

// Load environment variables from .env file
dotenv.config({ path: "./config.env" });

// Replace placeholders in database connection string
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

// Connect to the MongoDB database
mongoose
  .connect(DB)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => console.error("DB connection error:", err));

// Load NFT data from JSON file
const nfts = JSON.parse(
  fs.readFileSync(`${__dirname}/nft-simple.json`, "utf-8")
);

// Validate each NFT object
const validateNFT = (nft) => {
  return (
    nft.name &&
    nft.duration &&
    nft.maxGroupSize &&
    nft.price &&
    nft.summary &&
    nft.startDates
  );
};

// Remove duplicates from input data
const deduplicateNFTs = (nfts) => {
  const uniqueNFTs = [];
  const nameSet = new Set();

  nfts.forEach((nft) => {
    if (validateNFT(nft) && !nameSet.has(nft.name)) {
      uniqueNFTs.push(nft);
      nameSet.add(nft.name); // Track unique names
    }
  });

  return uniqueNFTs;
};

// Import data into the database
const importData = async () => {
  try {
    const deduplicatedNFTs = deduplicateNFTs(nfts);

    if (deduplicatedNFTs.length === 0) {
      console.log("No valid or unique NFTs to import.");
      process.exit(0); // Exit with success code
    }

    // Filter out NFTs that already exist in the database
    const existingNFTs = await NFT.find({}, "name");
    const existingNames = new Set(existingNFTs.map((nft) => nft.name));

    const newNFTs = deduplicatedNFTs.filter((nft) => !existingNames.has(nft.name));

    if (newNFTs.length === 0) {
      console.log("No new NFTs to import. All NFTs already exist.");
      process.exit(0); // Exit with success code
    }

    await NFT.insertMany(newNFTs, { ordered: true });
    console.log("DATA successfully loaded!");
    process.exit(0); // Exit with success code
  } catch (error) {
    console.error("Error loading data:", error.message);
    process.exit(1); // Exit with failure code
  }
};

// Delete all data from the database
const deleteData = async () => {
  try {
    await NFT.deleteMany();
    console.log("DATA successfully deleted!");
    process.exit(0); // Exit with success code
  } catch (error) {
    console.error("Error deleting data:", error.message);
    process.exit(1); // Exit with failure code
  }
};

// Command-line argument handler
if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}
