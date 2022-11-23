const { TF } = require('./Timeframes');
const { fnum } = require('../reports/helper.js');

class Order {
  constructor(entryObj, quantity) {
    this.entry = entryObj;
    this.quantity = quantity;
    this.gain = 0;
    this.comment = '';

    this.tags = {};

    this.wallet = 0; // todo: move these two to 'OrderEmulated extends Order'
    this.stake = 0;
  }

  getId() {
    return this.entry.id;
  }
  getQuantity() {
    return this.quantity;
  }
  getIsLong() {
    return this.entry.isLong;
  }
  getType() {
    return this.entry.getType();
  }
  getSymbol() {
    return this.entry.symbol;
  }
  getEntryPrice() {
    return this.entry.entryPrice;
  }
  getTakeProfit() {
    return this.entry.takeProfit;
  }
  getStopLoss() {
    return this.entry.stopLoss;
  }
  getTimeframe() {
    return this.entry.timeframe;
  }
  getStrategy() {
    return this.entry.strategy;
  }

  getTagValue(tagName) {
    if (this.tags[tagName]) {
      return this.tags[tagName].value;
    }
    return this.entry.getTagValue(tagName);
  }

  setComment(cmt) {
    this.comment = cmt;
  }

  setTag(tagName, tagValue) {
    this.tags[tagName] = { value: tagValue };
  }
  setTags(tags) {
    this.tags = tags;
  }
  setQuantity(q) {
    this.quantity = q;
  }
  setGain(g) {
    this.gain = g;
  }
  setWallet(w) {
    this.wallet = w;
  }
  setStake(s) {
    this.stake = s;
  }

  getRealStake(leverage) {
    let USD_IN_GAME = this.quantity * this.entry.entryPrice;
    return USD_IN_GAME / (leverage ? leverage : 1);
  }

  getRealMaxLoss(leverage, buyPercent, sellPercent) {
    const USD_ENTRY = this.quantity * this.entry.entryPrice;
    const USD_STOP = this.quantity * this.entry.stopLoss;
    const LOSS =
      Math.abs(USD_ENTRY - USD_STOP) +
      USD_ENTRY * buyPercent +
      USD_STOP * sellPercent;
    return Math.max(LOSS, this.getRealStake(leverage));
  }

  /* export/import IO */

  tagsStringify() {
    let res = '';
    for (const tag in this.tags) {
      res +=
        ' ' +
        tag +
        ':' +
        this.tags[tag].value +
        (this.tags[tag].comment ? ' [' + this.tags[tag].comment + ']' : '');
    }
    return res;
  }

  toGUI() {
    return {
      id: this.getId(),
      time: this.entry.time,
      type: this.entry.getType(),
      symbol: this.entry.symbol,
      timeframe: this.entry.timeframe,
      strategy: this.entry.strategy,
      entryPrice: this.entry.entryPrice,
      takeProfit: this.entry.takeProfit,
      stopLoss: this.entry.stopLoss,
      active: this.entry.active ? 'Y' : 'N',
      result: this.entry.result,
      closeTime: this.entry.closeTime,
      closePrice: this.entry.closePrice,
      gainPercent: this.entry.gainPercent,
      takePriceReached: this.entry.takePriceReached,
      takePercentReached: this.entry.takePercentReached,
      lossPriceReached: this.entry.lossPriceReached,
      lossPercentReached: this.entry.lossPercentReached,

      quantity: this.quantity,
      gain: fnum(this.gain, 3),
      wallet: fnum(this.wallet, 3),
      stake: fnum(this.stake, 3),

      comment: [
        this.comment,
        this.entry.comment,
        this.entry.tagsStringify(),
        this.tagsStringify(),
      ].join(', '),
    };
  }
}

module.exports = Order;
