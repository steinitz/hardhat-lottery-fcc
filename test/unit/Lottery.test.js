const {assert, expect} = require ("chai")
require ("@nomicfoundation/hardhat-toolbox")
const {ethers, deployments} = require ("hardhat")
const {developmentChains, networkConfig} = require ("../../helper-hardhat-config.js")
const {getContract} = require('../../utils/getContract')

// Note - ideally we have one assert per "it"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", async function () {
    let lottery, vrfCoordinatorV2Mock, entranceFee
    const chainId = network.config.chainId

    beforeEach(async function () {
      ({signer, contract: lottery} = await getContract("Lottery", ["all"]))
      vrfCoordinatorV2Mock = await ethers.getContractAt(
        "VRFCoordinatorV2Mock", 
        (await deployments.get("VRFCoordinatorV2Mock")).address, 
        signer
      )
      entranceFee = await lottery.getEntranceFee()
      // console.log("Lottery.test", {vrfCoordinatorV2Mock})
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

    describe('enterRaffle', async function() {
      it('reverts if you don\'t pay enough', async function () {
        // const enterLotteryResult = await lottery.enterLottery()
        // console.log('revert test', {lottery.enterLottery()})
        await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
          lottery,
          'Lottery__InsufficientEntryETH'
        )
      })
      it('records entrants when they enter', async function () {
        await lottery.enterLottery({value: entranceFee})
        const entrant = await lottery.getEntrant(0)
        assert.equal(entrant, await signer.getAddress())
      })
      it('emits event on enter', async function () {
        await expect(lottery.enterLottery({value: entranceFee})).to.emit(
          lottery,
          'LotteryEnter'
        )
      })
    })
  })
