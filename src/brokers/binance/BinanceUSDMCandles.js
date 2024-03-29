/*
 ** Binance Futures USD-M Candles Source
 */

const BrokerCandlesInterface = require('../types/BrokerCandlesInterface.js');

const Candle = require('../../types/Candle.js');
const { TF } = require('../../types/Timeframes.js');
const TH = require('../../helpers/time');

const { USDMClient } = require('binance');
const { WebsocketClient } = require('binance');

class BinanceUSDMCandles extends BrokerCandlesInterface {
  static MAX_CANDLES_PER_REQUEST = 499;
  static CANDLES_REQUEST_WEIGHT = 2;
  static DEFAULT_1M_WEIGHT_LIMIT = 2400;
  static KEEP_PERCENT = 50;
  static KAPUT_PERCENT = 90;

  constructor({ apiKey, secretKey }) {
    super();
    this.client = new USDMClient({ api_key: apiKey, api_secret: secretKey });
    this.streams = {};

    this.exchangeInfo = null;

    // todo: update from exchangeInfo
    this.WEIGHT_LIMIT = BinanceUSDMCandles.DEFAULT_1M_WEIGHT_LIMIT;
    this.WEIGHT_KEEP = Math.floor(
      (this.WEIGHT_LIMIT / 100) * BinanceUSDMCandles.KEEP_PERCENT
    );
    this.WEIGHT_KAPUT = Math.floor(
      (this.WEIGHT_LIMIT / 100) * BinanceUSDMCandles.KAPUT_PERCENT
    );

    this.weightQueue = [];

    this.serverTime = TH.currentTimestamp();

    this.wsClient = new WebsocketClient({
      api_key: apiKey,
      api_secret: secretKey,
      beautify: true,

      pongTimeout: 15000,
      pingInterval: 60000,
      reconnectTimeout: 1500,
    });

    this.wsClient.on('message', (data) => {
      this.dispatchWSData(data);
    });

    var _self = this;
    setInterval(function () {
      _self.updateServerTime();
    }, 30000);
  }

  async init() {
    await this.client.getExchangeInfo().then((result) => {
      this.exchangeInfo = result;
    });

    return true;
  }

  async updateServerTime() {
    this.serverTime = await this.client.getServerTime();
    console.log(
      'BS_USDM: server time updated is now: ' + TH.ls(this.serverTime)
    );
  }

  /*
[
    {
        "symbol": "BTCUSDT",
        "priceChange": "-94.99999800",
        "priceChangePercent": "-95.960",
        "weightedAvgPrice": "0.29628482",
        "lastPrice": "4.00000200",
        "lastQty": "200.00000000",
        "openPrice": "99.00000000",
        "highPrice": "100.00000000",
        "lowPrice": "0.10000000",
        "volume": "8913.30000000",
        "quoteVolume": "15.30000000",
        "openTime": 1499783499040,
        "closeTime": 1499869899040,
        "firstId": 28385,   // First tradeId
        "lastId": 28460,    // Last tradeId
        "count": 76         // Trade count
    }
]
*/
  async getTradableSymbols() {
    const result = await this.client.get24hrChangeStatististics();
    let cnt = 1;
    return result
      .filter((s) => {
        if (s.symbol.endsWith('USDT')) {
          //if ( (s.count > 100) && (s.quoteVolume >= 10000000) )
          if (s.count > 10) {
            console.log(
              'BC-USDM: SYMBOL: ' +
                cnt +
                ': ' +
                s.symbol +
                ' price=' +
                s.weightedAvgPrice +
                ' vol=' +
                s.volume
            );
            cnt++;
            return true;
          } else {
            console.log(
              'BC-USDM: SKIP SYMBOL: ' +
                cnt +
                ': ' +
                s.symbol +
                ' price=' +
                s.weightedAvgPrice +
                ' vol=' +
                s.volume
            );
            return false;
          }
        }
        return false;
      })
      .map((s) => s.symbol);
  }

  // this function might return not yet closed candle
  async loadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp) {
    if (startTimestamp > endTimestamp) {
      throw new Error('BS-USDM: start greater than end!');
    }
    let allCandles = [];

    let currentStart = startTimestamp;

    while (true) {
      let candles = await this.tryLoadCandlesPeriod(
        symbol,
        timeframe,
        currentStart,
        endTimestamp
      );

      if (candles.length === 0) {
        break;
      }

      allCandles = [...allCandles, ...candles];
      let lastCandle = candles[candles.length - 1];

      if (lastCandle.closeTime >= endTimestamp - 1) {
        break;
      }

      currentStart = lastCandle.closeTime;
    }

    PIO.markUnclosedLastCandle(allCandles);

    return allCandles;
  }

  async waitQueue(sId, weight) {
    // todo: somehow export request queue logic outside to make it reusable
    // or find ready solution

    while (true) {
      let states = this.client.getRateLimitStates();
      if (!states) {
        return;
      }

      const upd = states.lastUpdated;
      let usedWeight = states['x-mbx-used-weight-1m'];

      if (usedWeight < this.WEIGHT_KEEP) {
        console.log('BS-USD: PASSED NO SLEEP used weight=' + usedWeight);
        return;
      }

      if (usedWeight > this.WEIGHT_KAPUT) {
        throw new Error('KAPUT percent reached on ' + sId);
      }

      // update queue
      const currentTimestamp = TH.currentTimestamp();
      this.weightQueue = this.weightQueue.filter(
        (w) => w.time > currentTimestamp
      );
      let plannedTime = null;

      if (this.weightQueue.length > 0) {
        const schedule = this.weightQueue[this.weightQueue.length - 1];
        if (schedule.weight + weight <= this.WEIGHT_KEEP) {
          schedule.weight += weight;
          plannedTime = schedule.time + 100;
        } else {
          plannedTime = schedule.time + 30000;
          this.weightQueue.push({ time: plannedTime, weight: weight });
        }
      } else {
        plannedTime = currentTimestamp + 30000;
        this.weightQueue.push({ time: plannedTime, weight: weight });
      }

      const delayMs = plannedTime - currentTimestamp;
      const delaySec = Math.floor(delayMs / 1000);
      const queueSize = this.weightQueue.length;

      console.log(
        'BS-USDM: (' +
          sId +
          ') SAFE_SLEEP=' +
          delaySec +
          ' usedWeight=' +
          usedWeight +
          ' queueSize=' +
          queueSize
      );

      await PIO.sleep(delayMs);
      //await this.updateServerTime();
    }
  }

  async tryLoadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp) {
    if (startTimestamp >= endTimestamp) {
      console.log('BS-USDM: tryLoadCandlesSPeriod start >= end');
      return [];
    }
    const sId = symbol + '-' + timeframe;
    console.log(
      'BS-USDM: (' +
        sId +
        ') TRY TO LOAD FROM ' +
        TH.ls(startTimestamp) +
        ' TO ' +
        TH.ls(endTimestamp)
    );

    const params = {
      symbol: symbol,
      interval: timeframe,
      limit: BinanceUSDMCandles.MAX_CANDLES_PER_REQUEST,
      startTime: startTimestamp,
      endTime: endTimestamp,
    };

    let data = null;
    let attempts = 0;

    while (!data && attempts < 10) {
      try {
        console.log('BS-USDM: (' + sId + ') prepare to wait! ' + TH.lsc());
        await this.waitQueue(sId, BinanceUSDMCandles.CANDLES_REQUEST_WEIGHT);
        console.log('BS-USDM: (' + sId + ') SAFE_SLEEP is done! ' + TH.lsc());
        data = await this.client.getKlines(params);
      } catch (err) {
        console.log('BS-USDM: try load candles exception:');
        console.log(err);
      }
      if (data) {
        break;
      }

      attempts++;
      console.log(
        'BS-USDM: try_load new attempt on ' + symbol + ' #' + attempts
      );
    }

    if (!data) {
      throw new Error('could not load ' + symbol);
    }
    let candles = [];

    data.forEach((oneCandle) => {
      let objectCandle = PIO.parseCandleFromREST(symbol, timeframe, oneCandle);
      candles.push(objectCandle);
    });

    console.log(
      'BS-USDM: (' +
        symbol +
        '-' +
        timeframe +
        ') TRY LOADED ' +
        candles.length +
        ' CANDLES.'
    );

    return candles;
  }

  subscribe(symbol, timeframe, subscriberObject) {
    const sid = symbol + '-' + timeframe;
    const foundStream = this.streams[sid];

    if (foundStream) {
      foundStream.subscribe(subscriberObject);
      return true;
    }

    const stream = new Stream(this.wsClient, symbol, timeframe);
    console.log('BS-USDM: added new stream: ' + sid);
    this.streams[sid] = stream;
    stream.subscribe(subscriberObject);
    return true;
  }

  unsubscribe(symbol, timeframe, subscriberObject) {
    // todo: if last subscriber unsubscribed disconnect websocket stream
    const sid = symbol + '-' + timeframe;
    const foundStream = this.streams[sid];
    if (foundStream) {
      return foundStream.unsubscribe(subscriberObject);
    }
    return false;
  }

  dispatchWSData(data) {
    // JSON.parse(data) ?
    //console.log('BS-USDM: dispatch websocket data:');
    //console.log(data);

    if (!data || data.e !== 'continuous_kline') {
      return;
    }
    const symbol = data.ps;
    const timeframe = data.k.i;

    const sid = symbol + '-' + timeframe;
    const foundStream = this.streams[sid];

    if (!foundStream) {
      throw new Error('BS-USDM: socket dispatch no stream exist: ' + sid);
    }

    foundStream.handleData(data);
  }
  /*
{
  "e":"continuous_kline",   // Event type
  "E":1607443058651,        // Event time
  "ps":"BTCUSDT",           // Pair
  "ct":"PERPETUAL"          // Contract type
  "k":{
    "t":1607443020000,      // Kline start time
    "T":1607443079999,      // Kline close time
    "i":"1m",               // Interval
    "f":116467658886,       // First trade ID
    "L":116468012423,       // Last trade ID
    "o":"18787.00",         // Open price
    "c":"18804.04",         // Close price
    "h":"18804.04",         // High price
    "l":"18786.54",         // Low price
    "v":"197.664",          // volume
    "n": 543,               // Number of trades
    "x":false,              // Is this kline closed?
    "q":"3715253.19494",    // Quote asset volume
    "V":"184.769",          // Taker buy volume
    "Q":"3472925.84746",    //Taker buy quote asset volume
    "B":"0"                 // Ignore
  }
}
*/

  getRAWSymbolInfo(symbol) {
    if (!this.exchangeInfo || !this.exchangeInfo.symbols) {
      return null;
    }
    const info = this.exchangeInfo.symbols.find((v) => v.symbol == symbol);
    return info;
  }

  getRAWSymbolFilter(symbolInfo, filterType, param) {
    let filter = symbolInfo.filters.find((v) => v.filterType == filterType);
    if (!filter) {
      return null;
    }
    return filter[param];
  }

  getSymbolInfo(symbol) {
    const info = this.getRAWSymbolInfo(symbol);
    if (!info) {
      throw new Error('BC-USDM: no exchangeInfo on ' + symbol);
    }

    const qtyPrecision = info.quantityPrecision;
    const minQty = this.getRAWSymbolFilter(info, 'MARKET_LOT_SIZE', 'minQty');
    const pricePrecision = info.pricePrecision;
    const tickSize = this.getRAWSymbolFilter(info, 'PRICE_FILTER', 'tickSize');

    if (isNaN(qtyPrecision) || isNaN(pricePrecision) || !minQty || !tickSize) {
      throw new Error('BC-USDM: could not get symbol info');
    }

    return {
      qtyPrecision,
      pricePrecision,
      minQty,
      tickSize,
    };
  }

  getAlignedEntryDetails(symbol, entryPrice, usdAmount, stopLoss, takeProfit) {
    const result = {
      quantity: 0,
      stopLoss: 0,
      takeProfit: 0,
    };

    const info = this.getSymbolInfo(symbol);
    const quantity = (usdAmount / entryPrice).toFixed(info.qtyPrecision);

    if (quantity < info.minQty) {
      throw Error(
        'quantity problem: ' +
          symbol +
          ' q=' +
          quantity +
          ' < minq=' +
          info.minQty
      );
    }

    result.quantity = Number(quantity);
    result.stopLoss = Number(stopLoss.toFixed(info.pricePrecision));
    result.takeProfit = Number(takeProfit.toFixed(info.pricePrecision));

    return result;
  }
}

class PIO {
  // private IO
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static markUnclosedLastCandle(candles) {
    if (candles.length === 0) return false;

    let lastCandle = candles[candles.length - 1];

    if (TH.isCandleCloseTimeInFuture(lastCandle)) {
      console.log(
        'BS-USDM: close in future, marking unclosed ' +
          lastCandle.symbol +
          '-' +
          lastCandle.timeframe +
          ' close:' +
          TH.ls(lastCandle.closeTime)
      );
      lastCandle.closed = false;
      return true;
    }

    return false;
  }

  static parseCandleFromREST(symbol, timeframe, inCandleData) {
    return new Candle({
      openTime: inCandleData[0],
      open: parseFloat(inCandleData[1]),
      high: parseFloat(inCandleData[2]),
      low: parseFloat(inCandleData[3]),
      close: parseFloat(inCandleData[4]),
      volume: parseFloat(inCandleData[5]),
      closeTime: parseFloat(inCandleData[6]),
      live: false,
      closed: true,
      symbol: symbol,
      timeframe: timeframe,
    });
  }

  static parseCandleFromWSS(symbol, timeframe, msg) {
    const cdl = msg['k'];

    return new Candle({
      openTime: cdl.t,
      open: parseFloat(cdl.o),
      high: parseFloat(cdl.h),
      low: parseFloat(cdl.l),
      close: parseFloat(cdl.c),
      volume: parseFloat(cdl.v),
      closeTime: cdl.T,
      live: true,
      closed: cdl.x ? true : false,
      symbol: symbol,
      timeframe: timeframe,
    });
  }
}

class Stream {
  constructor(wsClient, symbol, timeframe) {
    //        this.wsClient = wsClient;
    this.symbol = symbol;
    this.timeframe = timeframe;

    this.subscribers = [];
    wsClient.subscribeContinuousContractKlines(
      symbol,
      'perpetual',
      timeframe,
      'usdm',
      false
    );
  }

  handleData(data) {
    let objectCandle = PIO.parseCandleFromWSS(
      this.symbol,
      this.timeframe,
      data
    );
    if (objectCandle) {
      this.subscribers.forEach((s) =>
        s.newCandleFromBroker(objectCandle, data['E'])
      );
    }
  }

  subscribe(subscriberObject) {
    const found = this.subscribers.find((s) => s === subscriberObject);
    if (found) {
      return true;
    }
    this.subscribers.push(subscriberObject);
    return true;
  }

  unsubscribe(subscriberObject) {
    this.subscribers = this.subscribers.filter((s) => s !== subscriberObject);
  }
  /*
    getId() {
        return this.symbol+'-'+this.timeframe;
    }
*/
}

module.exports = BinanceUSDMCandles;
