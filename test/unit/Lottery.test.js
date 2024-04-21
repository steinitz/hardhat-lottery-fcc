const {getNamedAccounts} = require ("hardhat")
const {developmentChains} = require ("../../helper-hardhat-config.js")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", async function () {
    let lottery, vrfCoordinatorV2Mock

    beforeEach(async function () {
      const {deployer} = await getNamedAccounts()
    })
  })