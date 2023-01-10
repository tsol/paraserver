
/*
** This is mock up of future general structure REFACTORING.
**
**
*/

OrderState = 'wait','active','closed','canceled','error';

class TEntry {
  createdTime; // for market orders same as time

  id = {
    time, // actual enty time
    strategy,
    threadId, // strategy thread id
    symbol,
    timeframe,
  };

  stats = {
    pnlGain,
    percentTakeReached,
    percentLossReached,
  };

  orders = {
    entry: {  id, eid, price, amount, state, isMarket, isLong },
    takes: [{ id, eid, price, amount, state }],
    stops: [{ id, eid, price, amount, state }],
  };

  tags = {
    static,
    dynamic,
  };

  walletHistory = { amount, stake };
}

// all classes creator/injector
class VM {
  
  analyzersFactory;   // creates all strategies and indicators boxed instances
  candleDebug;        // interface for managing candleDebug info
  flags;
 
  taggerStatic;       // One class with list of taggers upon construction
  taggerDynamic;
  entryPlanner; 

  realBroker;
  emulationBroker;

  sequencer;          // responsible for ordered candle processing
  candleProcessor;    //  

  vmBusinesslogic; // entries / orders / realOrders

  // get core depenencies and construct maximum classes
  // after this we must be able to answer user queries from VMClientView
  constructor(id, dataDb, clientsEventHandler) {
  }

  // init/load project specific details 
  async init(symbols, timeframes, strategies, fromTime, toTime, candleProxy, brokerUser) {
    this.processor.init(symbols, timeframes, strategies);
    this.sequencer = new CandleSequencer(symbols, timeframes, candleProxy, candleProcessor);
    return await this.sequencer.init(fromTime, toTime);
  }


}

// vm state container + processor
// input: priceUpdates + closed candles
// out: internal state change
class VMBusinessLogic {

  allEntries;       // TEntriesList   --> planner ->
  realEntries;      // TEntriesList

  flags;
  tickers;

  isLive;

  constructor(
    analyzersFactory,
    taggerStatic,
    taggerDynamic,
    candleDebug,
    entryPlanner,
    realBroker
  ) {}

  init(symbols, timeframes, strategies) {} // create tickers
  switchLive() {};


}

// store and find Entries
class TEntriesList {
  entries = [];
  activeEntries = [];
  addOrder(orderParams) {}
  closeOrder();
}

/*
TODO: make one emulator with flag 'filtered'

Rough PIPELINE of closed candles phase to realOrders

phaseEnd ->
  -> Tickers -> AnalyzerIO.makeOrder(...) ->
    -> [ newOrders ]
      -> Taggers (static, newOrders, allOrders) -> set static entry tags (indicators based, all stat based)
        -> brokerEmulator ( newOrders ) -> allOrders
          -> Taggers ( dynamic, newOrders, allOrders.filtered ) -> set dynamic emulator tags (emulator stats based: risk, money)
            -> EntryPlanner ( [static, dynamic], {emulatedWallet}, newOrders ) -> set filtered flag
(if live)     -> Taggers ( dynamic, newOrders.filtered, realOrders ) -> set dynamic real tags (real stats based: real risk, real money)
               -> EntryPlanner ( [real], {realWallet}, newOrders.filtered ) -> set real flag
                -> brokerReal ( -> realOrders )



** Emulated BROKER

  1. implements priceUpdate(low,hi)
    -> apply actions on TEntriesList (allEntries)

  2. implements EntriesListManager

  moveSL, moveTP, close, addTake(percent, price)
    -> apply actions directly on TEntriesList (allEntries)
 

** Real BROKER

  1. implements HandleBrokerAccountEvents
    onBrokerOrderCanceled(id) onBrokerOrderFilled(id)

    -> apply actions on TEntriesList (realEntries)
 
  2. implements EntriesListManager

  moveSL, moveTP, close, addTake(percent, price)

    -> apply some actions directly on TEntriesList
    -> apply actions on brokerAccount 

*/


module.exports = TOrdersManager;
