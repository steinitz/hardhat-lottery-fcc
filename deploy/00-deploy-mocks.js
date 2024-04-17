const {network} = require('hardhat')
const {
  developmentChains, 
  BASE_FEE, 
  GAS_PRICE_LINK,
} = require('../helper-hardhat-config.js')

// console.log('00-deploy-mocks.js', {developmentChains}, {DECIMALS}, {INITIAL_PRICE})

module.exports = async ({
  getNamedAccounts, 
  deployments: {deploy = undefined, log = undefined} = {}
}) => {
  const {deployer} = await getNamedAccounts()
  // console.log('00-deploy-mocks.js', {deployer})
  // console.log('00-deploy-mocks.js', {network})
  
  const chainId = network.config.chainId

  if (developmentChains.includes(network.name)) {
    log('Local network detected.  Deploying mocks...')
    await deploy(
      'VRFCoordinatorV2Mock', {
        contract: 'VRFCoordinatorV2Mock',
        from: deployer,
        log: true,
        args: [
          BASE_FEE, // seems odd to set this e.g. what it Chainlink changes it?
          GAS_PRICE_LINK,
        ]
      }
    )
    log('Mocks deployed')
    log('-------------------------------------------')
  }
  
  // console.log(
  //   '00-deploy-mocks.js - anonymous deploy mock script running with',
  //   {deployer},
  //   {deploy},
  //   {log},
  //   {chainId}
  // )
}

module.exports.tags = ['all', 'mocks']
