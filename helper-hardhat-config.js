const {
  ethers,
} = require("hardhat")

const {
  SEPOLIA_CHAIN_ID,
  HARDHAT_CHAIN_ID,
} = require('./constants')

const networkConfig = {
  [SEPOLIA_CHAIN_ID]: {
    name: "sepolia",
    vrfCoordinatorV2address: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.parseEther("0.01"),
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "0", // we'll get a real one later
    callbackGasLimit: "500000",
    interval: "30", // 30 seconds
  },
  [HARDHAT_CHAIN_ID]: {
    name: "hardhat",
    vrfCoordinatorV2address: "?",
    entranceFee: ethers.parseEther("0.01"),
    // this is irrelevant for hardhat, so we just use the above
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    callbackGasLimit: "500000",
    interval: "30", // 30 seconds
  }
}

const developmentChains = ['hardhat', 'localhost']

const BASE_FEE = ethers.parseEther("0.25") // per request LINK cost
const GAS_PRICE_LINK = 1e9; // in reality this fluctuates with LINK price

module.exports = {
  networkConfig,
  developmentChains,
  BASE_FEE,
  GAS_PRICE_LINK
}