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

error Lottery__InsufficientEntryETH();

contract Lottery {

  // State Variables
  uint256 private immutable i_entranceFee;
  address payable[] private s_entrants;

  constructor(uint entranceFee) {
    i_entranceFee = entranceFee;
  }

  function enterLottery() public payable {
    if(msg.value < i_entranceFee) {revert Lottery__InsufficientEntryETH();}
    s_entrants.push(payable(msg.sender));
  }

  // public getters

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getEntrant(uint256 index) public view returns (address) {
    return s_entrants[index];
  }


}