// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// To Do
// Entry the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Select winnder every X minutes -- completely automated
// Chainlink Oracle:
//   Randomness, 
//   Automated Execution (Chainlink Keeper)

import '@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol';
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import '@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol';

// Type declarations

enum LotteryState {
  OPEN,
  CALCULATING
}

// Errors

error Lottery__InsufficientEntryETH();
error Lottery__TransferFailed();
error Lottery__NotOpen();
error Lottery__InvalidCallToPerformUpkeep(
  uint256 ethBalance,
  uint256 numEntrants,
  LotteryState lotteryState
);

/**
 * @title Lottery Contract
 * @author Steve Steinitz, based on Patrick Collins course
 * @notice untamberable decentralized Lottery
 * @dev implements Chainlink VRF v2 and Chainlink Automation
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {

  // State Variables
  uint256 private immutable i_entranceFee;
  address payable[] private s_entrants;
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant NUM_WORDS = 1;
  

  // Lottery Variables
  address private s_winner;
  LotteryState private s_lotteryState;
  uint256 private s_lotteryStartTimestamp;
  uint256 private immutable i_duration;

  // Events
  event LotteryEnter(address indexed player);
  event RequestedLotteryWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  // Functions
  constructor(
    address vrfCoordinatorV2, // contract
    uint256 entranceFee,
    bytes32 gasLane, 
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 duration
    ) 
    VRFConsumerBaseV2(vrfCoordinatorV2) 
  {
    i_entranceFee = entranceFee;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;

    s_lotteryState = LotteryState.OPEN;
    s_lotteryStartTimestamp = block.timestamp;
    i_duration = duration;
  }

  function enterLottery() public payable {
    // revert on error
    if(msg.value < i_entranceFee) {revert Lottery__InsufficientEntryETH();}
    if(s_lotteryState != LotteryState.OPEN) {revert Lottery__NotOpen();}

    // add entrant to array
    s_entrants.push(payable(msg.sender));
    emit LotteryEnter(msg.sender);
  }

  // two overridden Chainlink Automation callback functions: 
  // performUpkeep and checkUpkeep

  // Assumes the Chainlink subscription is funded sufficiently.
  function performUpkeep(bytes calldata /* performData */ ) 
    external override
    // returns (uint256 requestId)
  {
    (bool upkeepNeeded, ) = checkUpkeep('');
    s_lotteryState = LotteryState.CALCULATING;
    if(!upkeepNeeded) {
      revert Lottery__InvalidCallToPerformUpkeep( 
        address(this).balance,
        s_entrants.length,
        s_lotteryState
      );
    }
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

  // Chainlink Automation nodes calls performUpkeep when 
  // this function returns upkeepNeeded = true.
  // Here's the logic: return upkeepNeeded = true if
  // 1. our time duration should have passed
  // 2. The lottery should have at least one player and some ETH
  // 3. Our subscription is funded with LINK
  // 4. The Lottery should be open e.g. we're not waiting for a random number

  function checkUpkeep (
    bytes memory // calldata checkData
  ) public view override returns (
    bool upkeepNeeded, 
    bytes memory performData
  )  {
    bool isOpen = (LotteryState.OPEN == s_lotteryState);
    uint256 timeSoFar = (block.timestamp - s_lotteryStartTimestamp);
    bool shouldLotteryEnd = timeSoFar > i_duration;
    bool hasEntrants = (s_entrants.length > 0);
    bool hasETH = address(this).balance > 0;
    upkeepNeeded = isOpen && shouldLotteryEnd && hasEntrants && hasETH;
    return (upkeepNeeded, performData);
  }
 
  // overridden chainlink callback function
  function fulfillRandomWords(
    uint256 /* requestId */,
    uint256[] memory randomWords
  ) internal override {
    uint256 indexOfWinner = randomWords[0] % s_entrants.length;
    address payable winner = s_entrants[indexOfWinner];
    s_winner = winner;
    s_lotteryStartTimestamp = block.timestamp; 
    s_lotteryState = LotteryState.OPEN;
    s_entrants = new address payable[](0);
    (bool success, ) = winner.call{value: address(this).balance}("");
    if (!success) {
      revert Lottery__TransferFailed();
    }
    emit WinnerPicked(winner);
  }

  // public getters - function modifiers : view, pure (implicit)

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getEntrant(uint256 index) public view returns (address) {
    return s_entrants[index];
  }

  function getRecentWinner() public view returns (address) {
    return s_winner;
  }

  function getLotteryState() public view returns (LotteryState) {
    return s_lotteryState;
  }

  function getLotteryDuration() public view returns (uint256) {
    return i_duration;}

  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }

  function getNumberOfEntrants() public view returns (uint256) {
    return s_entrants.length;
  }

  function getLotteryStartTimestamp() public view returns (uint256) {
    return s_lotteryStartTimestamp;
  }

  function getRequestConfirmations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }
}