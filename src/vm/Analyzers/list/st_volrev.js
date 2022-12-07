/*
Volume Reverse Strategy by Harry
*/

const Strategy = require('../types/Strategy');

const L = require('../helpers/levels.js');
const { rriskRatio } = require('../helpers/common');

class PARAMS {
  static MIN_RRISK = 1.35;
  static STOP_ADD_ATR = 1.1;
}

class VOLREV extends Strategy {
  constructor() {
    super();
    this.finder = null;
    this.name = 'volrev';

    this.impulseUp = null;
    this.impulseStartCandle = null;
    this.trendStartCandle = null;
    this.maxFrontImpulseTail = null;
  }

  init(io) {
    super.init(io);
    io.require('vlevels');
    io.require('impulse');
    io.require('magnets');
    io.require('atr14');
  }

  getId() {
    return this.name;
  }

  addCandle(candle, io) {
    super.addCandle(candle, io);
    io.cdb().setSource(this.getId());

    const impulseStartCandle = io.get('impulse.start');

    if (impulseStartCandle) {
      this.impulseStartCandle = impulseStartCandle;
      this.impulseUp = impulseStartCandle.isGreen();
      this.maxFrontImpulseTail = this.impulseUp
        ? impulseStartCandle.high
        : impulseStartCandle.low;

      const trendStartCandle = io.get('impulse.trend');
      if (trendStartCandle) {
        this.trendStartCandle = trendStartCandle;
      }
    }

    if (this.impulseStartCandle) {
      this.maxFrontImpulseTail = this.impulseUp
        ? Math.max(this.maxFrontImpulseTail, candle.high)
        : Math.min(this.maxFrontImpulseTail, candle.low);
    } else {
      return;
    }

    const impulseLastCandle = io.get('impulse.end');
    if (!impulseLastCandle) return;

    const entryPrice = candle.close;
    const isLong = !this.impulseUp;

    const magnets = io.get('magnets');

    const recentMagnets = magnets.getSince(this.trendStartCandle.openTime);

    const takeProfitMagnets = isLong
      ? magnets.filterAbove(entryPrice, recentMagnets)
      : magnets.filterBelow(entryPrice, recentMagnets);

    const recentMagnetsInfo = magnets.getInfo(takeProfitMagnets);

    if (recentMagnetsInfo.weight <= 0) {
      io.cdb().labelBottom(candle, 'xW');
      return this.impulseOver();
    }

    const takeProfit = isLong
      ? recentMagnetsInfo.maxPrice
      : recentMagnetsInfo.minPrice;

    /*
      const takeProfit =
      (recentMagnetsInfo.maxPrice + recentMagnetsInfo.minPrice) / 2;
    */

    const stopLoss =
      this.maxFrontImpulseTail +
      io.get('atr14') * PARAMS.STOP_ADD_ATR * (isLong ? -1 : 1);

    if (rriskRatio(entryPrice, takeProfit, stopLoss) >= PARAMS.MIN_RRISK) {
      io.makeEntry(this, isLong ? 'buy' : 'sell', {
        takeProfit,
        stopLoss,
      });
    }

    this.impulseOver();
  }

  impulseOver() {
    this.impulseUp = null;
    this.impulseStartCandle = null;
    this.maxFrontImpulseTail = null;
  }
}

module.exports = VOLREV;
