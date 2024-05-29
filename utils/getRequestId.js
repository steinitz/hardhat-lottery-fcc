const getRequestId = async (transactionResponse) => {
  const transactionReceipt = await transactionResponse.wait(1);
  // the following now seems to misunderstand how the receipt stores events
  // we get the second event ([1]) of the tx, I think because of the
  // redundant event noted in the contract's performUpkeep
  // console.log({transactionReceipt})
  const logs = transactionReceipt.logs;
  // console.log('01-deploy-lottery.js', {logs})
  const topics = logs[0].topics;
  // console.log('01-deploy-lottery.js', {topics})          
  // no worky - const requestId = txReceipt.events[1].args.requestId
  // not convinced this is the requestId but it does match
  // the value in the contract
  const requestId = topics[2];
  // no worky - assert (requestId.toNumber() > 0)
  return (parseInt(Number(requestId)));
};
exports.getRequestId = getRequestId;
