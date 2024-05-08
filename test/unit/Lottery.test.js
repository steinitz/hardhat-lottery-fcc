const {assert, expect} = require ("chai")
require ("@nomicfoundation/hardhat-toolbox")
const {ethers, deployments, network} = require ("hardhat")
const {developmentChains, networkConfig} = require ("../../helper-hardhat-config.js")
const {getContract} = require('../../utils/getContract')

// Note from Patrick: - ideally we have one assert per "it", but...

const timeForward = async (lotteryDuration /* bigint seconds */) => {
  await network.provider.send(
    "evm_increaseTime", 
    [ethers.toBeHex(Number(lotteryDuration) + 1)] // is there a better way?
  )
  await network.provider.request({method: 'evm_mine', params: []})
}

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
    })

    describe("constructor", function () {
      it("initializes the lottery correctly", async function () {
        const lotteryState = await lottery.getLotteryState()
        // would like to use LotteryState.OPEN rather than "0".  But how?
        assert.equal(lotteryState.toString(), "0")
        assert.equal(lotteryDuration.toString(), networkConfig[chainId]["lotteryDuration"])
        assert.equal(chainlinkAutomationUpdateInterval.toString(), networkConfig[chainId]["chainlinkAutomationUpdateInterval"])
      })
    })

    describe('enterLottery', function() {
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

        // move forward in time to force checkUpkeep() to 
        // return true so performUpkeep will do its thing
        await timeForward(lotteryDuration)

        // now checkUpkeep will return true so we call performUpkeep
        await lottery.performUpkeep("0x")

        await expect(lottery.enterLottery({value: entranceFee})).to.be.revertedWithCustomError(
          lottery,
          'Lottery__NotOpen'
        )
      })
    })

    describe('checkUpkeep', function() {
      it('returns false if people haven\'t sent any ETH', async function () {
        await timeForward(lotteryDuration)
        const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x") // ethers 6
        assert(!upkeepNeeded)
      })
      it('returns false if lottery is not open', async function () {
        await lottery.enterLottery({value: entranceFee})
        // place the lottery in calculating state

        // move forward in time to force checkUpkeep() to 
        // return true so performUpkeep will do its thing
        await timeForward(lotteryDuration)
        await lottery.performUpkeep("0x") // this should set the state to calculating
        const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x") // ethers 6
        assert.equal(upkeepNeeded, false)

        // patrick also asserts that the lottery state is not open
        // but what's the point here?  Maybe there should be another test.
        // const lotteryState = await lottery.getLotteryState()
        // const enumValues = Object.values(lottery.interface.enums.LotteryState);
        // console.log({enumValues})
        // assert.equal(lotteryState.toString(), "1")
      })
      it('returns false if enough time hasn\'t passed', async function () {
        // time can pass before this test runs os we get the lottery's time so far
        // and use it in the calculation below, to make sure we are at a time
        // before the lottery ends
        const timeSoFar = await lottery.getTimeSoFar()
        // console.log({timeSoFar})
        await network.provider.send(
          "evm_increaseTime", 
          [ethers.toBeHex(Number(lotteryDuration - timeSoFar) - 1)] // is there a better way?
        )
        await network.provider.request({method: 'evm_mine', params: []})
        const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x") // ethers 6
        assert.equal(upkeepNeeded, false)
      })
      it('returns true if enough time passed & has balance & players', async function () {
        await lottery.enterLottery({value: entranceFee})

        // move forward in time to force checkUpkeep() to 
        // return true so performUpkeep will do its thing
        await timeForward(lotteryDuration)
        const {upkeepNeeded} = await lottery.checkUpkeep.staticCall("0x") // ethers 6
        assert.equal(upkeepNeeded, true)
      })
    })
    describe('performUpkeep', function() {
      it(' only runs if checkUpkeep is true', async function () {
        await lottery.enterLottery({value: entranceFee})

        // move forward in time to force checkUpkeep() to 
        // return true so performUpkeep will do its thing
        await timeForward(chainlinkAutomationUpdateInterval)
        await expect(lottery.performUpkeep("0x")).to.be.revertedWithCustomError(
          lottery,
          'Lottery__InvalidCallToPerformUpkeep'
        )
        // assert(tx)
      })
    })
  })
