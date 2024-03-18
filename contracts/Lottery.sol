// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// To Do
// Entry the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Select winnder every X minutes -- completely automated
// Chainlink Oracle:
//   Randomness, 
//   Automated Execution (Chainlink Keeper)

import "hardhat/console.sol";
import '@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';

error Lottery__InsufficientEntryETH();

contract Lottery is VRFConsumerBaseV2 {

  // State Variables
  uint256 private immutable i_entranceFee;
  address payable[] private s_entrants;
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant NUM_WORDS = 1;

  // Events
  event LotteryEnter(address indexed player);
  event RequestedLotteryWinner(uint256 indexed requestId);

  constructor(
    address vrfCoordinatorV2,
    uint256 entranceFee,
    bytes32 gasLane, 
    uint64 subscriptionId,
    uint32 callbackGasLimit
    ) 
    VRFConsumerBaseV2(vrfCoordinatorV2) 
  {
    i_entranceFee = entranceFee;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
  }

  function enterLottery() public payable {
    // revert on error
    if(msg.value < i_entranceFee) {revert Lottery__InsufficientEntryETH();}

    // add entrant to array
    s_entrants.push(payable(msg.sender));
    emit LotteryEnter(msg.sender);
  }

  // Assumes the Chainlink subscription is funded sufficiently.
  function requestRandomWinner() 
    external 
    // returns (uint256 requestId)
  {
    // Will revert if subscription is not set and funded.
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane, // keyHash chainlink docs
        i_subscriptionId,
        REQUEST_CONFIRMATIONS,
        i_callbackGasLimit,
        NUM_WORDS
    );
    // s_requests[requestId] = RequestStatus({
    //     randomWords: new uint256[](0),
    //     exists: true,
    //     fulfilled: false
    // });
    // requestIds.push(requestId);
    // lastRequestId = requestId;
    // emit RequestSent(requestId, numWords);
    emit RequestedLotteryWinner(requestId);

    // return requestId;
  }
  
  // overridden chainlink callback function
  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override {
  }

  // public getters - function modifiers : view, pure (implicit)

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getEntrant(uint256 index) public view returns (address) {
    return s_entrants[index];
  }

}