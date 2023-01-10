/*
Volume Reverse Strategy by Harry
*/

const Strategy = require('../types/Strategy');

const L = require('../helpers/levels.js');
const { rriskRatio } = require('../helpers/common');
const {
  getLevelsArrayFromFlags,
  getLevelsInfoAtCandleArray,
  getLevelsYRange,
} = require('../helpers/levels.js');

class PARAMS {
  static MIN_RRISK = 1.35;
  static STOP_ADD_ATR = 1.1;
  static STOP_MIN_ATR = 0.1;
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
    io.require('mat1');
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

    // ETHUSDT-15m-volrev-1655268299999
    //ETHUSDT-15m-volrev-1670398199999
    let test = 0;

    const isLong = !this.impulseUp;

    const mat = io.get('mat1');

    if (mat) {
      if ((isLong && mat == 'UP') || (!isLong && mat == 'DN')) {
        return this.impulseOver();
      }
    }

    const bounceInfo = this.findBounceOffLevel(
      isLong,
      [impulseLastCandle, candle],
      io.getFlags()
    );

    if (!bounceInfo) return this.impulseOver();

    this.makeEntry(isLong, candle, io, bounceInfo);

    this.impulseOver();
  }

  findBounceOffLevel(isLong, candles, flags) {
    const levels = getLevelsArrayFromFlags(flags);

    const levelsInfo = getLevelsInfoAtCandleArray(levels, candles, isLong);
    if (levelsInfo.levels.length === 0) return null;

    const rangeInfo = getLevelsYRange(levelsInfo.levels);
    return rangeInfo;
  }

  makeEntry(isLong, candle, io, bounceInfo) {
    const entryPrice = candle.close;

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

    const stopLoss =
      (isLong
        ? Math.min(this.maxFrontImpulseTail, bounceInfo.levelY0)
        : Math.max(this.maxFrontImpulseTail, bounceInfo.levelY1)) +
      io.get('atr14') * PARAMS.STOP_ADD_ATR * (isLong ? -1 : 1);

    // const stopLoss =
    //   (isLong ? candle.low : candle.high) +
    //   io.get('atr14') * PARAMS.STOP_MIN_ATR * (isLong ? -1 : 1);

    if (rriskRatio(entryPrice, takeProfit, stopLoss) >= PARAMS.MIN_RRISK) {
      io.makeEntry(this, isLong ? 'buy' : 'sell', {
        takeProfit,
        stopLoss,
      });
    }
  }

  impulseOver() {
    this.impulseUp = null;
    this.impulseStartCandle = null;
    this.maxFrontImpulseTail = null;
  }
}

module.exports = VOLREV;
