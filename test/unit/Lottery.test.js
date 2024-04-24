const {assert} = require ("chai")
const {getNamedAccounts, ethers, deployments} = require ("hardhat")
const {developmentChains, networkConfig} = require ("../../helper-hardhat-config.js")
const {getContract} = require('../../utils/getContract')

// Note - ideally we have one assert per "it"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", async function () {
    let lottery, vrfCoordinatorV2Mock
    const chainId = network.config.chainId

    console.log("Lottery.test", {chainId})

    beforeEach(async function () {
      // const {deployer} = await getNamedAccounts()
      // await deployments.fixture(["all"])
      // lottery = await getContract("lottery", deployer)
      ({signer, contract: lottery} = await getContract("Lottery", ["all"]))
      console.log("Lottery.test", {lottery})
      // vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", deployer)
      // ({contract: vrfCoordinatorV2Mock} = await getContract("VRFCoordinatorV2Mock", ["all"]))
      vrfCoordinatorV2Mock = await ethers.getContractAt(
        "VRFCoordinatorV2Mock", 
        (await deployments.get("VRFCoordinatorV2Mock")).address, 
        signer)
      console.log("Lottery.test", {vrfCoordinatorV2Mock})
    })

    describe("constructor", async function () {
      it("initializes the lottery correctly", async function () {
        const lotteryState = await lottery.getLotteryState()
        const duration = await lottery.getLotteryDuration()
        // would like to use LotteryState.OPEN rather than "0".  But how?
        assert.equal(lotteryState.toString(), "0")
        assert.equal(duration.toString(), networkConfig[chainId]["duration"])
      })
    })
  })
