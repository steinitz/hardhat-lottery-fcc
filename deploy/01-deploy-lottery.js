const {network} = require("hardhat")
const {developmentChains, networkConfig} = require("../helper-hardhat-config")
const chainId = network.config.chainId
const {verify} = require("../utils/verify")
require("../constants")
const {getContract} = require('../utils/getContract')

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30") // fund the subscription

module.exports = async function({
  getNamedAccounts,
  deployments
}) {
  const {deploy, log} = deployments
  const {deployer} = await getNamedAccounts()
  let vrfCoordinatorV2Mock, vrfCoordinatorV2Address, subscriptionId, signer

  if (developmentChains.includes(network.name)) {
    ({contract: vrfCoordinatorV2Mock, signer} = await getContract("VRFCoordinatorV2Mock"))
    // console.log('01-deploy-lottery', {vrfCoordinatorV2Mock})
    vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
    // console.log('01-deploy-lottery', {vrfCoordinatorV2Address})
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    // console.log('01-deploy-lottery.js', {transactionReceipt})
    const logs = transactionReceipt.logs
    // console.log('01-deploy-lottery.js', {logs})
    const topics = logs[0].topics
    // console.log('01-deploy-lottery.js', {topics})
    subscriptionId = BigInt(topics[1]) 
    // console.log('01-deploy-lottery.js', {subscriptionId})
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
  }
  else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2Address"]
    subscriptionId = networkConfig[chainId]["subscriptionId"]
  }

  const entranceFee = networkConfig[chainId]["entranceFee"]
  const gasLane = networkConfig[chainId]["gasLane"]
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
  const lotteryDuration = networkConfig[chainId]["lotteryDuration"]
  const chainlinkAutomationUpdateInterval = networkConfig[chainId]["chainlinkAutomationUpdateInterval"]

  const args = [
    vrfCoordinatorV2Address, 
    entranceFee, 
    gasLane,
    subscriptionId,
    callbackGasLimit,
    lotteryDuration,
    chainlinkAutomationUpdateInterval,
  ]
  const lottery = await deploy("Lottery", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  // Ensure the Lottery contract is a valid consumer of the 
  // VRFCoordinatorV2Mock contract.  Can't be done above because 
  // we don't have the Lottery contract at that point.

  const lotteryAddress = lottery.address
  if (developmentChains.includes(network.name)) {
    console.log(
      "01-deploy - calling VRFCoordinatorV2Mock.addConsumer with", 
      {subscriptionId},
      {lotteryAddress}, 
    )
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, lotteryAddress)
  }

  if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(lotteryAddress, args)
  }

  log("---------------------------------")
}

module.exports.tags = ["all", "lottery"]