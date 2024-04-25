require("hardhat-deploy")
require("@nomicfoundation/hardhat-toolbox")
require("hardhat-contract-sizer")
require("dotenv").config()
const {
  SEPOLIA_CHAIN_ID,
  HARDHAT_CHAIN_ID,
  BLOCK_CONFIRMATIONS
} = require('./constants')
/** @type import('hardhat/config').HardhatUserConfig */

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const SEPOLIA_KEY = process.env.SEPOLIA_KEY
// const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
// const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

module.exports = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [SEPOLIA_KEY],
      chainId: SEPOLIA_CHAIN_ID,
      blockConfirmations: BLOCK_CONFIRMATIONS, // wait this many blocks after deploying
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      // accounts: thanks hardhat,
      chainId: HARDHAT_CHAIN_ID,
    },
  },
  gasReporter: {
    enabled: false,
    outputFile: 'gas-report.txt',
    noColors: true,
    currency: 'AUD',
    token: 'ETH', // 'MATIC',
    // coinmarketcap: COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
};
