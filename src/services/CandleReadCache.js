// todo: this module should also replace candle storage
// and retrieve in Tickers in main core

const { TF } = require('../types/Timeframes');

class CandleReadCache {
  constructor({ limit = null }) {
    this.cache = {};
    this.limit = limit;
  }

  getClosedAfter(symbol, timeframe, closeTime) {
    const a = this.cache[symbol]?.[timeframe];
    if (!a) return [];
    return a.filter((c) => c.closeTime > closeTime);
  }

  getCandlesBack(symbol, timeframe, closeTime, maxCandlesBack) {
    const a = this.cache[symbol]?.[timeframe];
    if (!a) return [];
    if (a.length < 1) return [];
    const fromTime =
      closeTime - TF.getTimeframeLength(timeframe) * maxCandlesBack;
    return a.filter((c) => c.closeTime > fromTime && c.closeTime <= closeTime);
  }

  findCandlesBack(
    symbol,
    timeframe,
    periodEndTime,
    maxCandlesBack,
    maxCandlesTofind,
    handler
  ) {
    const a = this.cache[symbol]?.[timeframe];
    if (!a) return [];

    if (a.length < 1) return [];

    const toTime = periodEndTime || a.at(-1).closeTime;
    const fromTime = toTime - TF.getTimeframeLength(timeframe) * maxCandlesBack;

    let candles = a.filter(
      (c) => c.closeTime > fromTime && c.closeTime <= toTime
    );

    const result = [];
    let count = 0;
    for (const candle of candles.reverse()) {
      if (handler(candle)) {
        result.push(candle);
        if (++count >= maxCandlesTofind) return result;
      }
    }

    return result;
  }

  addCandle(candle) {
    const { symbol, timeframe } = candle;

    if (!this.cache[symbol]) {
      this.cache[symbol] = {};
    }

    if (!this.cache[symbol][timeframe]) {
      this.cache[symbol][timeframe] = [];
    }

    const a = this.cache[symbol][timeframe];
    const limit = this.limit || TF.get(timeframe).limit;

    a.push(candle);

    while (a.length > limit) {
      this.cache.shift();
    }
  }

  getFirstTimestamp(symbol, timeframe) {
    const a = this.cache[symbol]?.[timeframe];
    if (!a || a.length < 1) return null;
    return this.a[0].openTime;
  }

  getLastTimestamp(symbol, timeframe) {
    const a = this.cache[symbol]?.[timeframe];
    if (!a || a.length < 1) return null;
    return this.candles[this.candles.length - 1].closeTime;
  }
}

module.exports = CandleReadCache;
