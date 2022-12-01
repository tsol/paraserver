const SETTINGS = require('../../../private/private.js');
const TH = require('../../helpers/time.js');
const { TF } = require('../../types/Timeframes.js');
const CandleDebugEntry = require('../../types/CandleDebugEntry');

class CandleDebug {
  constructor(storeCache) {
    this.storeCache = storeCache;
    this.source = 'none';
    this.items = [];
    this.forgotBefore = 0;
  }

  getStoreCache() {
    return this.storeCache;
  }

  setSource(s) {
    this.source = s;
  }

  findItemByCandle(candle) {
    return this.items.find(
      (cd) =>
        cd.symbol === candle.symbol &&
        cd.time === candle.openTime &&
        cd.timeframe === candle.timeframe
    );
  }

  addItemByCandle(candle, debugEntry) {
    if (candle.openTime <= this.forgotBefore) {
      console.log('WARN: CDB: request debug on very old candle', candle);
      return false;
    }

    let item = this.findItemByCandle(candle);

    if (item) {
      item.addEntry(debugEntry);
      this.storeCache.itemChanged(candle.closeTime, item);
      return;
    }

    item = new CandleDebugEntry({
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      time: candle.openTime,
    });
    this.items.push(item);
    item.addEntry(debugEntry);
    this.storeCache.itemNew(item);
  }

  forgetBefore(symbol, timeframe, timestamp) {
    this.forgotBefore = timestamp;
    this.items = this.items.filter(
      (cd) =>
        cd.symbol !== symbol ||
        cd.timeframe !== timeframe ||
        cd.time > timestamp
    );
  }

  onChart(candle, name, value, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    const def = {
      type: 'onchart',
      name: name,
      value: value,
    };
    let result = { ...def, ...param };
    this.addItemByCandle(candle, result);
  }

  offChart(candle, name, value, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    const def = {
      type: 'offchart',
      name: name,
      value: value,
    };
    let result = { ...def, ...param };
    this.addItemByCandle(candle, result);
  }

  circleHigh(candle, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    const def = {
      type: 'circle',
      color: 'white',
      from: [candle.openTime, candle.high],
      radius: 1,
      src: this.source,
    };
    let result = { ...def, ...param };
    this.addItemByCandle(candle, result);
  }

  circleLow(candle, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    let result = { ...param, ...{ from: [candle.openTime, candle.low] } };
    this.circleHigh(candle, result);
  }

  circleMiddle(candle, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    let result = {
      ...param,
      ...{
        from: [candle.openTime, candle.low + (candle.high - candle.low) / 2],
      },
    };
    this.circleHigh(candle, result);
  }

  line(candle, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    const defaultY = candle.isRed() ? candle.high : candle.low;
    const defaultColor = candle.isRed() ? 'red' : 'green';

    const def = {
      type: 'line',
      color: defaultColor,
      width: 2,
      x0: candle.openTime,
      y0: defaultY,
      x1: candle.openTime + TF.getCandleTimeframeLength(candle) * 3,
      y1: defaultY,
      src: this.source,
    };
    let result = { ...def, ...param };
    this.addItemByCandle(candle, result);
  }

  hline(candle, y, param = {}) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    let result = { ...param, y0: y, y1: y };
    this.line(candle, result);
  }

  labelTop(candle, label) {
    if (SETTINGS.noCandleDebug) {
      return;
    }

    this.addItemByCandle(candle, {
      type: 'label',
      position: 'top',
      label: label,
      src: this.source,
    });
  }

  labelBottom(candle, label) {
    if (SETTINGS.noCandleDebug) {
      return;
    }

    this.addItemByCandle(candle, {
      type: 'label',
      position: 'bottom',
      label: label,
      src: this.source,
    });
  }

  entry(candle, entryPrice, takeProfit, stopLoss) {
    if (SETTINGS.noCandleDebug) {
      return;
    }
    this.addItemByCandle(candle, {
      type: 'entry',
      src: 'entries',
      ep: entryPrice,
      tp: takeProfit,
      sl: stopLoss,
      by: this.source,
    });
  }
}

module.exports = CandleDebug;
