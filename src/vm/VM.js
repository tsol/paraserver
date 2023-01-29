/*
 ** VM object, containing one virtual trading system.
 **
 ** It is configured with its own set of symbols, timeframes, strategies, options and a
 ** period upon which emulator is run.
 **
 ** VM loads all up, processes history candles and then processes online candle updates.
 **
 ** After initialization (and also during) it gives user list of candles, entries, orders.
 ** allows user to re-run entries -> orders simulation with different filters and settings
 **
 ** VM is like a users working desktop. Server can support multiple simultanious VMs
 ** (for every user for example)
 **
 */

const StoreCache = require('../db/StoreCache');
const OrdersManager = require('./Orders/OrdersManager');
const CandleDebug = require('./Processor/CandleDebug');
const VMCandleProcessor = require('./Processor/VMCandleProcessor');
const CandleSequencer = require('./Sequencer/CandleSequencer');
const AnalyzersFactory = require('./Analyzers/AnalyzersFactory.js');

class VM {
  constructor(vmId, dataDb, candleProxy, brokerUser, clients) {
    this.dataDb = dataDb;

    this.brokerUser = brokerUser;
    this.candleProxy = candleProxy;
    this.clients = clients;
    this.analyzersFactory = new AnalyzersFactory();

    this.candleDebugDb = dataDb.makeCandleDebugIO(vmId);
    this.ordersDb = dataDb.makeOrdersIO(vmId);
    this.ordersDb.reset();

    this.candleDebug = new CandleDebug(new StoreCache(this.candleDebugDb));
    this.ordersManager = new OrdersManager(
      brokerUser,
      candleProxy.getBroker(),
      clients,
      this.candleDebug,
      this.ordersDb
    );

    this.processor = new VMCandleProcessor(
      this.ordersManager,
      this.analyzersFactory,
      this.candleDebug,
      this.dataDb,
      this.ordersDb
    );
    this.sequencer = null;

    this.symbols = null;
    this.timeframes = null;
    this.strategies = null;
    this.fromTime = null;
    this.toTime = null;
    this.options = null;
  }

  getCandleDebugDb() {
    return this.candleDebugDb;
  }
  getCandleDebug() {
    return this.candleDebug;
  }
  getBrokerUser() {
    return this.brokerUser;
  }
  getCandleProxy() {
    return this.candleProxy;
  }
  getSequencer() {
    return this.sequencer;
  }
  getProcessor() {
    return this.processor;
  }
  getOrdersManager() {
    return this.ordersManager;
  }
  getTimeframes() {
    return this.timeframes;
  }
  getSymbols() {
    return this.symbols;
  }
  getStrategies() {
    return this.strategies;
  }

  async init(symbols, timeframes, strategies, fromTime, toTime, options) {
    this.symbols = symbols;
    this.timeframes = timeframes;
    this.strategies = strategies;
    this.fromTime = fromTime;
    this.toTime = toTime;
    this.options = options;

    this.processor.init(symbols, timeframes, strategies);

    this.sequencer = new CandleSequencer(
      symbols,
      timeframes,
      this.candleProxy,
      this.processor
    );

    return await this.sequencer.init(fromTime, toTime);
  }

  //todo: add/remove symbol, timeframe, strategy, moveFrom, moveTo, switchLive
}

module.exports = VM;
