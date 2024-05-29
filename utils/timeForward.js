const { ethers, network } = require("hardhat");

// Note from Patrick: - ideally we have one assert per "it", but...
const timeForward = async (lotteryDuration /* bigint seconds */) => {
  await network.provider.send(
    "evm_increaseTime",
    [ethers.toBeHex(Number(lotteryDuration) + 1)] // is there a better way?
  );
  await network.provider.request({ method: 'evm_mine', params: [] });
};
exports.timeForward = timeForward;
