// Lottery

// To Do
// Entry the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Select winnder every X minutes -- completely automated
// Chainlink Oracle:
//   Randomness, 
//   Automated Execution (Chainlink Keeper)

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "hardhat/console.sol";
import '@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/vrf/VRFCoordinatorV2.sol';

error Lottery__InsufficientEntryETH();

contract Lottery is VRFConsumerBaseV2 {

  // State Variables
  uint256 private immutable i_entranceFee;
  address payable[] private s_entrants;

  // Events
  event LotteryEnter(address indexed player);

  constructor(
    address vrfCoordinator,
    uint256 entranceFee
    ) 
    VRFConsumerBaseV2(vrfCoordinator) 
  {
    i_entranceFee = entranceFee;
  }

  function enterLottery() public payable {
    // revert on error
    if(msg.value < i_entranceFee) {revert Lottery__InsufficientEntryETH();}

    // add entrant to array
    s_entrants.push(payable(msg.sender));
    emit LotteryEnter(msg.sender);
  }

  // function requestRandomWinner() external {
    
  // }

  // overridden chainlink callback function
  // function fulfillRandomWords(uint256 requestId) internal override {
  //   console.log('fulfillRandomWords');
  // }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override {
    // uint256 indexOfWinner = randomness; // randomWords[0] % s_players.length;
}

  // public getters - function modifiers : view, pure (implicit)

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getEntrant(uint256 index) public view returns (address) {
    return s_entrants[index];
  }


}