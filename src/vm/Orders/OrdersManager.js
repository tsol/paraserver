const OrdersReal = require('./OrdersReal.js');
const { TF } = require('../../types/Timeframes.js');

const EntryPlan = require('./EntryPlan');
const Entry = require('../../types/Entry.js');

const TaggersStatic = require('./taggers/TaggersStatic.js');

const SETTINGS = require('../../../private/private.js');
const ReportIntervals = require('../../reports/ReportIntervals');
const ArbitrageTagger = require('./taggers/ArbitrageTagger');

class OrdersManager {
  static LIMIT_ORDER_TIMEOUT_CANDLES = 1;

  constructor(brokerUser, brokerCandles, clients, candleDebug, ordersDb) {
    this.clients = clients;
    this.brokerCandles = brokerCandles;
    this.real = new OrdersReal(brokerUser, clients);
    this.report = new ReportIntervals();
    this.candleDebug = candleDebug;
    this.ordersDb = ordersDb;

    this.entriesQueue = [];
    this.entries = [];
    this.activeEntries = [];
    this.limitEntries = [];

    this.staticTaggers = new TaggersStatic();
    this.entryPlan = new EntryPlan(brokerCandles);

    this.lastUpdateTime = null;
    this.previousHour = null;
    this.previousMinute = null;

    this.isLive = false;
  }

  reset() {
    this.lastUpdateTime = null;
    this.previousHour = null;
    this.previousMinute = null;
    this.real.reset();
    // todo entries/entryPlan etc...
  }

  switchLive() {
    this.isLive = true;
  }

  /* analyzers IO */

  getSymbolInfo(symbol) {
    return this.brokerCandles.getSymbolInfo(symbol);
  }

  queueEntry(params) {
    this.entriesQueue.push(params);
  }

  marketEntry(params) {
    params = this.adjustSLTP(params);
    if (!params) {
      return null;
    }

    let flagsSnapshot = null;

    if (!SETTINGS.noFlagsSnapshot) {
      flagsSnapshot = JSON.parse(
        JSON.stringify(
          params.flags.getAllFlagsByTickerId(
            params.flags.id(params.symbol, params.timeframe)
          )
        )
      );
    }

    const entry = new Entry(params);

    let found = this.activeEntries.find((e) => e.id === entry.id);
    if (found) {
      return null;
    }

    entry.setFlags(flagsSnapshot);

    entry.setTags(
      this.staticTaggers.getStaticTags(entry, params.flags, this.entries)
    );
    entry.setComment(params.comment);

    /* filter */

    this.candleDebug.setSource(params.strategy);
    this.candleDebug.circleMiddle(params.candle, {
      color: 'blue',
      radius: 5,
      alpha: 0.1,
    });

    this.activeEntries.push(entry);
    this.entries.push(entry);

    return entry;
  }

  limitEntry(params) {
    params = this.adjustSLTP(params);
    if (!params) {
      return null;
    }

    const expire =
      params.time +
      OrdersManager.LIMIT_ORDER_TIMEOUT_CANDLES *
        TF.getTimeframeLength(params.timeframe);

    params.expire = expire;

    console.log(
      'OEMU: new limit entry: ' +
        params.symbol +
        '-' +
        params.timeframe +
        ' ' +
        TH.ls(params.time) +
        '(' +
        params.time +
        ') -> ' +
        TH.ls(params.expire) +
        ' (' +
        params.expire +
        ')'
    );

    this.limitEntries.push(params);
  }

  // adjust takeProfit and stopLoss en entry according to broker rules (precision)
  adjustSLTP(params) {
    try {
      const aligned = this.brokerCandles.getAlignedEntryDetails(
        params.symbol,
        params.entryPrice,
        1000,
        params.stopLoss,
        params.takeProfit
      );

      params.stopLoss = aligned.stopLoss;
      params.takeProfit = aligned.takeProfit;
      //quantity = aligned.quantity;

      return params;
    } catch (e) {
      console.log('BAD ORDER PARAMS: ' + e.message);
      return null;
    }
  }

  async doMakeOrderReal(emulatedOrder) {
    if (!this.isLive) {
      return null;
    }

    // todo: later split successfull creation and negative scenario
    this.clients.onNewRealOrder(emulatedOrder);

    try {
      let res = await this.real.makeMarketOrder(emulatedOrder);
      emulatedOrder.setComment(' [BROK] ' + JSON.stringify(res));
      return res;
    } catch (err) {
      console.log('MAKE_EMULATE_ORDER: ERROR');
      console.log(err);
      emulatedOrder.setComment(' [BRER] ' + err.message);
    }
    return null;
  }

  async doMakeOrderRealById(entryId) {
    const order = this.entryPlan.getOrderByEntryId(entryId);

    if (!order) {
      return null;
    }
    return await this.doMakeOrderReal(order);
  }

  async entriesToOrders(entries, isLimit) {
    if (entries.length == 0) {
      return;
    }

    let ordersApproved = this.entryPlan.addEntries(entries);

    if (!this.isLive) {
      return;
    }

    if (SETTINGS.dev || isLimit) {
      // Do not make real orders in DEV mode
      // or for now limit orders
      return;
    }

    for (let order of ordersApproved) {
      this.doMakeOrderReal(order);
    }
  }

  /* candleProcessor io */

  // todo: limit orders should be approved the same way as market orders here:

  // this is called at the end of each candle sequencer phase
  // to process all Entries accumulated in buffer
  processEntriesQueue() {
    let addedEntries = [];
    this.entriesQueue.forEach((p) => {
      if (p.isLimit) {
        this.limitEntry(p);
      } else {
        let entry = this.marketEntry(p);
        if (entry) {
          addedEntries.push(entry);
        }
      }
    });
    this.entriesQueue = [];

    this.entriesToOrders(addedEntries, false);
  }

  priceUpdate(symbol, eventTime, lowPrice, highPrice, currentPrice) {
    if (this.isClockUpdated(eventTime)) {
      this.runSchedule();
    }

    let entries = this.activeEntries.filter((o) => o.symbol === symbol);
    let long = entries.filter((o) => o.isLong);
    let short = entries.filter((o) => !o.isLong);

    // 1. MARGIN CALLS + STOP LOSSES first

    short.forEach((o) => {
      if (highPrice >= o.stopLoss) {
        this.closeEntry(o, false, o.stopLoss);
      }
    });

    long.forEach((o) => {
      if (lowPrice <= o.stopLoss) {
        this.closeEntry(o, false, o.stopLoss);
      }
    });

    short = short.filter((o) => o.isActive());
    long = long.filter((o) => o.isActive());

    // 2. take profits

    short.forEach((o) => {
      if (lowPrice <= o.takeProfit) {
        this.closeEntry(o, true, o.takeProfit);
      }
    });

    long.forEach((o) => {
      if (highPrice >= o.takeProfit) {
        this.closeEntry(o, true, o.takeProfit);
      }
    });

    entries = entries.filter((o) => o.isActive());

    // update price anyway
    entries.forEach((o) => o.updateCurrentPrice(currentPrice));

    this.limitEntriesPriceUpdate(
      symbol,
      eventTime,
      lowPrice,
      highPrice,
      currentPrice
    );

    return;
  }

  /* emulator */

  limitEntriesPriceUpdate(
    symbol,
    eventTime,
    lowPrice,
    highPrice,
    currentPrice
  ) {
    let entries = this.limitEntries.filter((o) => o.symbol === symbol);
    let addedEntries = [];

    entries.forEach((o) => {
      if (o.isLong) {
        if (highPrice >= o.entryPrice) {
          console.log(
            'OEMU: limit BUY entry TRIGGERED ' +
              o.symbol +
              '-' +
              o.timeframe +
              ' ' +
              TH.ls(eventTime) +
              ' (' +
              eventTime +
              ')'
          );
          this.killLimitEntry(o);
          let entry = this.marketEntry(o);
          if (entry) {
            addedEntries.push(entry);
          }
        }
      } else {
        if (lowPrice <= o.entryPrice) {
          console.log(
            'OEMU: limit SELL entry TRIGGERED ' +
              o.symbol +
              '-' +
              o.timeframe +
              ' ' +
              TH.ls(eventTime) +
              ' (' +
              eventTime +
              ')'
          );
          this.killLimitEntry(o);
          let entry = this.marketEntry(o);
          if (entry) {
            addedEntries.push(entry);
          }
        }
      }
    });

    entries = this.limitEntries.filter((o) => o.symbol === symbol);

    entries.forEach((o) => {
      if (eventTime >= o.expire) {
        this.killLimitEntry(o);
        console.log(
          'OEMU: limit entry timeout ' +
            o.symbol +
            '-' +
            o.timeframe +
            ' ' +
            TH.ls(eventTime) +
            ' (' +
            eventTime +
            ')'
        );
      }
    });

    this.entriesToOrders(addedEntries, true);
  }

  killLimitEntry(entry) {
    this.limitEntries = this.limitEntries.filter((o) => o !== entry);
  }

  getEntries() {
    return this.entries;
  }

  closeAll(entriesArray) {
    let entries = entriesArray || this.activeEntries;
    console.log('OEMU: closing all');
    console.log(entries);
    entries.forEach(
      (o) =>
        this.closeEntry(o, o.gainPercent > 0, null) && o.setTag('SHTDN', 'Y')
    );
  }

  closeEntry(entry, isWin, updatePrice) {
    if (updatePrice !== null) {
      entry.updateCurrentPrice(updatePrice);
    }

    entry.doClose(isWin, this.lastUpdateTime);
    this.activeEntries = this.activeEntries.filter((o) => o !== entry);
    this.entryPlan.closeEntry(entry);

    this.ordersDb.save([entry]);
  }

  toGUI() {
    return this.entries.map((v) => {
      return v.toGUI();
    });
  }

  getEntryById(entryId) {
    if (!this.entries || this.entries.length === 0) {
      return null;
    }
    return this.entries.find((v) => v.id == entryId);
  }

  /* schedule */

  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  isClockUpdated(eventTime) {
    if (!this.lastUpdateTime || eventTime > this.lastUpdateTime) {
      this.lastUpdateTime = eventTime;
      return true;
    }
    return false;
  }

  /* only run after updateClock == true */
  runSchedule() {
    const now = new Date(this.lastUpdateTime);
    const minute = Math.ceil((now.getTime() / 1000) * 60);
    const hour = Math.ceil(minute / 60);

    if (this.previousHour !== hour) {
      this.previousHour = hour;
      this.scheduleHourly();
    }

    if (this.previousMinute !== minute) {
      this.previousMinute = minute;
      this.scheduleMinutely();
    }
  }

  scheduleHourly() {}
  scheduleMinutely() {}

  /* user interface io */

  getEntriesList() {
    return this.toGUI();
  }

  getOrdersList(args) {
    return this.entryPlan.getOrdersGUI(args);
  }

  getRealOrdersList(args) {
    return this.real.getOrdersGUI(args);
  }

  getEntryPlanParams() {
    return this.entryPlan.getParams();
  }

  setEntryPlanParams(params) {
    return this.entryPlan.processEntriesHistory(params, this.entries);
  }

  getReport(params) {
    return this.report.getReport(
      this.entryPlan.getOrders(),
      params.dateFrom,
      params.dateTo,
      params.interval
    );
  }

  getTagDescriptions() {
    return [
      ...this.staticTaggers.getTagDescriptions(),
      ...this.entryPlan.getDynamicTaggers().getTagDescriptions(),
      ...ArbitrageTagger.getRISKMTagDescription(),
    ];
  }

  /*
    getEmulatedStatistics(fromTimestamp, toTimestamp) {
        return this.emulator.genStatistics(fromTimestamp, toTimestamp);
    }

*/

  /*
    async doMakeRealOrder(order) {
    
        this.clients.onNewRealOrder(order);

        if ( SETTINGS.dev ) {
            return null;
        }

        let result = null;

        await this.real.newOrderFromEmu(emulatedOrder).then((res) => {
            emulatedOrder.setComment(' [BROK] '+JSON.stringify(res));
            result = res;
            // todo: save to db
        }).catch( (err) => {
            console.log('MAKE_EMULATE_ORDER: ERROR');
            console.log(err);
            emulatedOrder.setComment(' [BRER] '+err.message);
        });

        return result;

    }
*/
}

module.exports = OrdersManager;
