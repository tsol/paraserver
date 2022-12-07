function rriskRatio(entryPrice, takeProfit, stopLoss) {
  const tph = Math.abs(entryPrice - takeProfit);
  const slh = Math.abs(entryPrice - stopLoss);

  if (slh === 0) return 0;

  return tph / slh;
}

module.exports = {
  rriskRatio,
};
