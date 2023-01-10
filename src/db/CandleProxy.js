/*
 ** CandleProxy - is a caching proxy for loading candles.
 **
 ** It stores retreived candles in database, and the ones missing -
 ** requests from broker
 **
 ** Once retreived from broker those candles are stored in database
 ** for future cached access.
 **
 ** This class allows much quicker data reload debug when developing strategies
 ** and modifying the engine.
 */

const { TF } = require('../types/Timeframes.js');
const TH = require('../helpers/time');

class CandleProxy {
  // Type: DBCandlesInterface, BrokerCandlesInterface
  constructor(candleDb, candleSourceBroker) {
    this.db = candleDb;
    this.broker = candleSourceBroker;
  }

  storeNewCandles(arrCandles) {
    arrCandles.forEach((candle) => {
      this.db.saveCandlesToDB(candle.symbol, candle.timeframe, [candle]);
    });
  }

  getBroker() {
    return this.broker;
  }

  async getClosedCandlesSince(symbol, timeframe, sinceTimestamp, doUseBroker) {
    const currentTimestamp = TH.currentTimestamp();
    return await this.getCandlesPeriod(
      symbol,
      timeframe,
      sinceTimestamp,
      currentTimestamp,
      doUseBroker
    );
  }

  // this will load from mysql candles
  // get from broker who has symbol missing candles up to current time
  // (if required by several requests)
  // store missing candles to mysql (only closed ones!)
  // and return all candles array in a Promise

  async getCandlesPeriod(
    symbol,
    timeframe,
    sinceTimestamp,
    toTimestamp,
    doUseBroker
  ) {
    let dbCandles = await this.db.loadCandlesPeriod(
      symbol,
      timeframe,
      sinceTimestamp,
      toTimestamp
    );

    if (!doUseBroker) {
      return dbCandles;
    }

    const broker = this.broker;

    let needBrokerSince = sinceTimestamp;
    let needBrokerTo = toTimestamp;

    if (
      !dbCandles ||
      dbCandles.length === 0 ||
      PIO.candlesNotConsistent(dbCandles, symbol, timeframe)
    ) {
      let brokerCandles = await broker.loadCandlesPeriod(
        symbol,
        timeframe,
        needBrokerSince,
        needBrokerTo
      );

      PIO.removeUnclosedCandles(brokerCandles);

      this.db.saveCandlesToDB(symbol, timeframe, brokerCandles);

      return brokerCandles;
    }

    let firstCandle = dbCandles[0];
    let lastCandle = dbCandles[dbCandles.length - 1];

    if (PIO.candleHitsBoundary(firstCandle, sinceTimestamp)) {
      if (PIO.candleHitsBoundary(lastCandle, toTimestamp)) {
        // all period was loaded from db, cool...
        console.log(
          'CDL-PROXY: DB_ONLY (' +
            symbol +
            '-' +
            timeframe +
            ') ' +
            TH.ls(sinceTimestamp) +
            ' <- DB -> ' +
            TH.ls(toTimestamp)
        );
        return dbCandles;
      }

      // only first part came from db, loading rest from broker
      needBrokerSince = lastCandle.closeTime + 1;
      needBrokerTo = toTimestamp;

      console.log(
        'CDL-PROXY: DB-BROKER (' +
          symbol +
          '-' +
          timeframe +
          ') ' +
          TH.ls(sinceTimestamp) +
          ' <- DB -> ' +
          TH.ls(needBrokerSince) +
          ' <- BROKER -> ' +
          TH.ls(needBrokerTo)
      );

      let brokerCandles = await broker.loadCandlesPeriod(
        symbol,
        timeframe,
        needBrokerSince,
        needBrokerTo
      );

      PIO.removeUnclosedCandles(brokerCandles);
      this.db.saveCandlesToDB(symbol, timeframe, brokerCandles);

      return [...dbCandles, ...brokerCandles];
    }

    // We know there is no begining in db

    let brokerCandlesBeforeDb = [];

    needBrokerSince = sinceTimestamp;
    needBrokerTo = firstCandle.closeTime - 1;

    console.log(
      'CDL-PROXY: BROKER-DB-? (' +
        symbol +
        '-' +
        timeframe +
        ') ' +
        TH.ls(needBrokerSince) +
        ' <- BROKER -> ' +
        TH.ls(needBrokerTo) +
        ' <- DB -> ' +
        TH.ls(lastCandle.closeTime - 1) +
        ' <- ? -> ' +
        TH.ls(toTimestamp)
    );

    brokerCandlesBeforeDb = await broker.loadCandlesPeriod(
      symbol,
      timeframe,
      needBrokerSince,
      needBrokerTo
    );

    let brokerCandlesAfterDb = [];

    needBrokerSince = lastCandle.closeTime + 1;
    needBrokerTo = toTimestamp;

    if (needBrokerSince < needBrokerTo) {
      console.log(
        'CDL-PROXY: ?-DB-BROKER (' +
          symbol +
          '-' +
          timeframe +
          ') ' +
          TH.ls(sinceTimestamp) +
          ' <- DB-BROKER1 -> ' +
          TH.ls(needBrokerSince) +
          ' <- BROKER -> ' +
          TH.ls(needBrokerTo)
      );

      brokerCandlesAfterDb = await broker.loadCandlesPeriod(
        symbol,
        timeframe,
        needBrokerSince,
        needBrokerTo
      );
      PIO.removeUnclosedCandles(brokerCandlesAfterDb);
    }

    this.db.saveCandlesToDB(symbol, timeframe, [
      ...brokerCandlesBeforeDb,
      ...brokerCandlesAfterDb,
    ]);

    return [...brokerCandlesBeforeDb, ...dbCandles, ...brokerCandlesAfterDb];
  }

  async getPeriodBordersFromDB(symbol, timeframe, targetTimestamp, maxCandles) {
    const [dbFirstCandle, dbLastCandle] = await Promise.all([
      this.db.getFirstCandle(symbol, timeframe),
      this.db.getLastCandle(symbol, timeframe),
    ]);

    if (!dbFirstCandle || !dbLastCandle) {
      throw new Error('no data');
    }

    const [firstTimestamp, lastTimestamp] = [
      dbFirstCandle.openTime,
      dbLastCandle.openTime,
    ];

    if (!targetTimestamp) {
      targetTimestamp = lastTimestamp;
    }
    if (!maxCandles) {
      maxCandles = 1000;
    }

    const tfLen = TF.getTimeframeLength(timeframe);
    const periodLen = tfLen * maxCandles;
    const halfPeriod = Math.floor(periodLen / 2);

    let startTimestamp = targetTimestamp - halfPeriod;
    let endTimestamp = targetTimestamp + halfPeriod;

    // shift maxCandles right
    if (startTimestamp < firstTimestamp) {
      const diff = firstTimestamp - startTimestamp;
      startTimestamp = firstTimestamp;
      endTimestamp += diff;
    }

    // shift maxCandles left
    if (endTimestamp > lastTimestamp) {
      const diff = endTimestamp - lastTimestamp;
      endTimestamp = lastTimestamp;
      startTimestamp -= diff;
    }

    // truncate left wing (less than maxCandles return)
    if (startTimestamp < firstTimestamp) {
      startTimestamp = firstTimestamp;
    }

    return { startTimestamp, endTimestamp };
  }
}

class PIO {
  /* private static */

  static candleHitsBoundary(candle, timestamp) {
    return candle.openTime <= timestamp && candle.closeTime >= timestamp;
  }

  static removeUnclosedCandles(candlesArray) {
    if (!candlesArray || candlesArray.length == 0) {
      return false;
    }
    let lc = candlesArray[candlesArray.length - 1];
    if (!lc.closed) {
      console.log('CDL-PROXY: removed last candle from array was not closed');
      console.log(
        lc.symbol +
          '-' +
          lc.timeframe +
          ' open: ' +
          TH.ls(lc.openTime) +
          ' close: ' +
          TH.ls(lc.closeTime)
      );
      candlesArray.pop();
    }
  }

  // WARNING: on brokers with gaps
  static candlesNotConsistent(candlesArray, symbol, timeframe) {
    for (let i = 1; i < candlesArray.length; i++) {
      if (
        !this.oneCandleRightAfterAnther(candlesArray[i - 1], candlesArray[i])
      ) {
        console.log('CDL-PROXY: candle array not consistent!');
        console.log(candlesArray[i]);
        return true;
      }
    }

    return false;
  }

  static oneCandleRightAfterAnther(firstCandle, secondCandle) {
    return firstCandle.closeTime + 1 === secondCandle.openTime;
  }
}

module.exports = CandleProxy;
