class AnalyzersIO {
  static ENTRY_DEF_RR_RATIO = 1.5;
  static ENTRY_STOP_ATR_RATIO = 1;
  static ENTRY_TARGET_LEVEL_REQ_WEIGHT = 40;
  static ENTRY_TARGET_LEVEL_SEARCH_RATIO = 1.8;
  static ENTRY_SWSL_FIND_MAX_CANDLES = 25;

  constructor(box, ordersManager, candleProcessor, candleDebug) {
    this.box = box;
    this.ordersManager = ordersManager;
    this.candleProcessor = candleProcessor;
    this.candleDebug = candleDebug;

    this.candle = null;
    this.flags = null;
  }

  init() {
    this.require('rsi14'); // required by static order tag 'RSI'
    this.require('atr14'); // required by automatic default SL/TP calc in makeEntry function
    this.require('prev_swing'); // required by makeEntry function
    this.require('btctrend'); // required by static tags BT9, BT20
    this.require('hl_trend'); // required by static HLT15m, HLT1h tags
  }

  require(analyzerName) {
    return this.box.addAnalyzer(analyzerName);
  }

  getHTF(flagName) {
    return this.flags.getHTF(flagName);
  }

  cdb() {
    return this.candleDebug;
  }

  get(flagName) {
    return this.flags.get(flagName);
  }

  set(flagName, value) {
    this.flags.set(flagName, value);
  }

  getCandlesFrom(closeTime) {
    return this.candleProcessor.getCandlesFrom(
      this.candle.symbol,
      this.candle.timeframe,
      closeTime
    );
  }

  findCandlesBack(periodEndTime, maxCandlesBack, maxCandlesTofind, handler) {
    return this.candleProcessor.findCandlesBack(
      this.candle.symbol,
      this.candle.timeframe,
      periodEndTime,
      maxCandlesBack,
      maxCandlesTofind,
      handler
    );
  }

  getSymbolInfo(symbol) {
    return this.ordersManager.getSymbolInfo(symbol);
  }

  // enters at current candles close
  makeEntry(
    strategyObject,
    type,
    {
      entryPrice,
      stopLoss,
      takeProfit,
      stopFrom,
      rrRatio,
      stopATRRatio,
      useTargetLevel,
      usePrevSwing,
    }
  ) {
    /*
        if (this.getOpenOrder(
            this.candle.symbol, this.candle.timeframe, strategyObject.getId()
            )) {
            //console.log('HELPER: order already open');
            return false;
        }
        */

    const isLimit = Boolean(entryPrice);
    const isBuy = type === 'buy';
    const direction = isBuy ? 1 : -1;

    const atr14 = this.flags.get('atr14');
    if (!atr14) {
      return console.log('HELPER: atr14 not ready.');
    }

    let cmt = '';

    if (!rrRatio) {
      rrRatio = AnalyzersIO.ENTRY_DEF_RR_RATIO;
    }
    if (!stopATRRatio) {
      stopATRRatio = AnalyzersIO.ENTRY_STOP_ATR_RATIO;
    }

    if (!entryPrice) {
      entryPrice = this.candle.close;
    }

    if (!stopFrom) {
      stopFrom = entryPrice;
    }

    if (!stopLoss) {
      stopLoss = stopFrom - direction * atr14 * stopATRRatio;
    }
    if (usePrevSwing) {
      stopLoss = this.calcPrevSwingSL(type, stopLoss);
    }

    const stopHeight = Math.abs(entryPrice - stopLoss);

    if (!takeProfit) {
      takeProfit = entryPrice + direction * stopHeight * rrRatio;
    }

    const params = {
      time: this.candle.closeTime,
      strategy: strategyObject.getId(),
      symbol: this.candle.symbol,
      timeframe: this.candle.timeframe,
      isLong: isBuy,
      entryPrice: entryPrice,
      takeProfit: takeProfit,
      stopLoss: stopLoss,
      comment: cmt,
      flags: this.flags,
      candle: this.candle,
    };

    // invert
    /*
         params.isLong = ! params.isLong;
         const tmp = params.takeProfit;
         params.takeProfit = params.stopLoss;
         params.stopLoss = tmp;
         params.cmt += ' INV';
        */

    params.isLimit = isLimit;

    this.ordersManager.queueEntry(params);
  }

  getOpenOrder(symbol, timeframe, strategy) {
    return this.ordersManager.getOpenOrder(symbol, timeframe, strategy);
  }

  getFlags() {
    return this.flags;
  }

  /* parent box interface */

  setCurrentCandleAndFlags(candle, flags) {
    this.candle = candle;
    this.flags = flags;
  }

  /* helpers */

  // returns stopLoss
  calcPrevSwingSL(orderType, stopLoss) {
    const isLong = orderType == 'buy';
    const sw = this.flags.get('prev_swing');
    if (!sw) {
      return null;
    }

    if (isLong) {
      const swCandleLow = sw.findLow(
        AnalyzersIO.ENTRY_SWSL_FIND_MAX_CANDLES,
        stopLoss
      );
      if (!swCandleLow) {
        return stopLoss;
      }
      return swCandleLow.low;
    }

    const swCandleHigh = sw.findHigh(
      AnalyzersIO.ENTRY_SWSL_FIND_MAX_CANDLES,
      stopLoss
    );
    if (!swCandleHigh) {
      return stopLoss;
    }
    return swCandleHigh.high;
  }
}

module.exports = AnalyzersIO;
