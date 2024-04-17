const {
  deployments, 
  ethers,
} = require("hardhat")


const getContract = async (contractName, deploymentsFixtureTags) => {

  // for local testing re-use the same deployment
  if (deploymentsFixtureTags) {
    await deployments.fixture(deploymentsFixtureTags)
  }

  // console.log({contractName})
  signer = await ethers.provider.getSigner()
  // console.log({signer})

  const deployment = await deployments.get(contractName)
  // console.log({deployment})

  const contract = await ethers.getContractAt(
    contractName, 
    deployment.address, 
    signer
  ) 
  // console.log({fundMe})
  return {signer, contract};
}


module.exports = {
  getContract
}