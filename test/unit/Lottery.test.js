const {assert, expect} = require ("chai")
require ("@nomicfoundation/hardhat-toolbox")
const {ethers, deployments, network} = require ("hardhat")
// require("ethers").ethers.BigNumber;
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

// reproduce the LotteryState Solidity enum here
const LotteryStateEnum = {
  open: 0,
  calculating: 1,
}

const getRequestId = async (transactionResponse) => {
  const transactionReceipt = await transactionResponse.wait(1)
  // the following now seems to misunderstand how the receipt stores events
  // we get the second event ([1]) of the tx, I think because of the
  // redundant event noted in the contract's performUpkeep
  // console.log({transactionReceipt})
  const logs = transactionReceipt.logs
  // console.log('01-deploy-lottery.js', {logs})
  const topics = logs[0].topics
  // console.log('01-deploy-lottery.js', {topics})          
  // no worky - const requestId = txReceipt.events[1].args.requestId
  // not convinced this is the requestId but it does match
  // the value in the contract
  const requestId = topics[2]; 
  // no worky - assert (requestId.toNumber() > 0)
  return (parseInt(Number(requestId)))
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
      // console.log('tests beforeEach', {entranceFee})
      chainlinkAutomationUpdateInterval = await lottery.getChainlinkAutomationUpdateInterval()
      lotteryDuration = await lottery.getLotteryDuration()
    })

    describe("constructor", function () {
      it("initializes the lottery correctly", async function () {
        const lotteryState = await lottery.getLotteryState()
        // would like to use LotteryState.OPEN rather than "0".  But how?
        // assert.equal(lotteryState.toString(), "0")
        assert.equal(lotteryState, LotteryStateEnum.open)
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
      it("runs if checkupkeep is true", async () => {
        await lottery.enterLottery({ value: entranceFee })
        await timeForward(lotteryDuration)
        const txResponse = await lottery.performUpkeep("0x") 
        assert(txResponse)
      })
      it('reverts if checkup is false', async function () {
        await lottery.enterLottery({value: entranceFee})

        // move forward in time to force checkUpkeep() to 
        // return true so performUpkeep will do its thing
        // await timeForward(chainlinkAutomationUpdateInterval)
        await expect(lottery.performUpkeep("0x")).to.be.revertedWithCustomError(
          lottery,
          'Lottery__UpkeepNotNeeded'
        )
      })
      it(
        'updates lottery state and emits an event', 
        async function () {
          await lottery.enterLottery({ value: entranceFee })
          await timeForward(lotteryDuration)
          const transactionResponse = await lottery.performUpkeep("0x")
          const requestId = await getRequestId(transactionResponse)
          assert (requestId > 0)
          const lotteryState = await lottery.getLotteryState() // updates state
          assert.equal(lotteryState, LotteryStateEnum.calculating)
      })
    })
    describe('fulfillRandomWords', function() {
      beforeEach(async function () {
        await lottery.enterLottery({value: entranceFee})
      })
      it('can only be called after performUpkeep', async function () {
        const lotteryAddress = lottery.getAddress()
        // console.log(
        //   'test "can only be called after performUpkeep" calling fulfillRandomWords with', 
        //   // {vrfCoordinatorV2Mock},
        //   {lotteryAddress},
        // )
        async function testRandomWords(requestId) {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.getAddress())
          ).to.be.revertedWithCustomError(
            lottery,
            'Lottery__NotOpen'
          )
        }
        await timeForward(lotteryDuration)
        await lottery.performUpkeep("0x") 
        // test a couple of fake requestIds - both should fail
        testRandomWords(0)
        testRandomWords(1)
      })
      it.only ('picks winner, resets, sends money', async () => {
        const additionalEntrants = 3
        const startingAccountIndex = 1 // deployer = 0
        const accounts = await ethers.getSigners()
        let lotteryWithAccounts
        // console.log({accounts})
        for(
          let i = startingAccountIndex; 
          i < startingAccountIndex + additionalEntrants; 
          i++
        ) {
          lotteryWithAccounts = lottery.connect(accounts[i])
          await lottery.enterLottery({ value: entranceFee })
        }

        const startingTimestamp = await lotteryWithAccounts.getTimestamp()
        const lotteryAddress = lotteryWithAccounts.getAddress()

        // we learned, by logging all the accounts and comparing it 
        // to the winning account, that the account at index 1 wil
        // always be the winner when using vrfCoordinatorV2Mock
        const winnerIndex = 1

        // to make this work with staging tests we need to simulate waiting
        // for the full duration of the lottery
        // console.log('Lottery.test - creating Promise to catch WinnerPicked event')
        await new Promise(async (resolve, reject) => {
          // console.log('Lottery.test "picks a winner, resets, and sends money" - inside Promise to catch WinnerPicked event')
          lotteryWithAccounts.once (
            'WinnerPicked', 
            async () => {
              // console.log('test "picks winner..." WinnerPicked event fired')
              try {
                // const recentWinner = await lottery.getRecentWinner()
                const lotteryState = await lottery.getLotteryState()
                const endingTimestamp = await lottery.getTimestamp()
                const numEntrants = await lottery.getNumberOfEntrants()
                const winnerEndingBalance = await 
                  accounts[winnerIndex].provider.getBalance(accounts[winnerIndex])
                assert.equal(numEntrants.toString(), '0')
                assert.equal(lotteryState, LotteryStateEnum.open)
                assert(endingTimestamp > startingTimestamp)
                const winnings = BigInt(entranceFee) * BigInt(numEntrants)
                assert.equal(
                  winnerEndingBalance,
                  winnerStartingBalance + winnings
                )
              } 
              catch (e) {
                reject(e)
              }
              resolve()
            }
          )
          let winnerStartingBalance
          try {
            await timeForward(lotteryDuration)
            const txResponse = await lotteryWithAccounts.performUpkeep("0x")
            // now done in getRequestId - 
            // const txReceipt = await txResponse.wait(1)
            const requestId = await getRequestId(txResponse)

            winnerStartingBalance = await 
              accounts[winnerIndex].provider.getBalance(accounts[winnerIndex])
            // console.log(
            //  'test "picks winner..." calling fulfillRandomWords with', 
            //  {requestId},
            //  {vrfCoordinatorV2Mock},
            //  {lotteryAddress},
            // )
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              requestId,
              lotteryAddress
            )
          } 
          catch (e) {
            reject(e)   
          }    
      })
    })
  })
})