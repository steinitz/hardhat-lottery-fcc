const {assert, expect} = require ("chai")
require ("@nomicfoundation/hardhat-toolbox")
const {ethers, deployments, network} = require ("hardhat")
const {developmentChains, networkConfig} = require ("../../helper-hardhat-config.js")
const {getContract} = require('../../utils/getContract')

// Note - ideally we have one assert per "it"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", async function () {
    let lottery, vrfCoordinatorV2Mock, entranceFee, lotteryDuration, chainlinkAutomationUpdateInterval
    const chainId = network.config.chainId

    // console.log({network})

    beforeEach(async function () {
      ({signer, contract: lottery} = await getContract("Lottery", ["all"]))
      vrfCoordinatorV2Mock = await ethers.getContractAt(
        "VRFCoordinatorV2Mock", 
        (await deployments.get("VRFCoordinatorV2Mock")).address, 
        signer
      )
      entranceFee = await lottery.getEntranceFee()
      chainlinkAutomationUpdateInterval = await lottery.getChainlinkAutomationUpdateInterval()
      lotteryDuration = await lottery.getLotteryDuration()
      // console.log({lotteryDuration})

      // console.log("Lottery.test", {vrfCoordinatorV2Mock})
    })

    describe("constructor", async function () {
      it("initializes the lottery correctly", async function () {
        const lotteryState = await lottery.getLotteryState()
        // would like to use LotteryState.OPEN rather than "0".  But how?
        assert.equal(lotteryState.toString(), "0")
        assert.equal(lotteryDuration.toString(), networkConfig[chainId]["lotteryDuration"])
        assert.equal(chainlinkAutomationUpdateInterval.toString(), networkConfig[chainId]["chainlinkAutomationUpdateInterval"])
      })
    })

    describe('enterLottery', async function() {
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
      it('prevents entering when lottery is not open', async function () {
        await lottery.enterLottery({value: entranceFee})
        // place the lottery in calculating state

        // two step process to force checkUpkeep to return true so 
        // performUpkeep will do its thing

        await network.provider.send(
          "evm_increaseTime", 
          [ethers.toBeHex(Number(lotteryDuration) + 1)] // is there a better way?
        )

        await network.provider.request({method: 'evm_mine', params: []})

        // now checkUpkeep will return true so we call performUpkeep
        await lottery.performUpkeep("0x")

        await expect(lottery.enterLottery({value: entranceFee})).to.be.revertedWithCustomError(
          lottery,
          'Lottery__NotOpen'
        )
      })
      
    })
  })
