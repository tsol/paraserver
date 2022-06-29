const OrdersEmulator = require('./OrdersEmulator');
const OrdersReal = require('./OrdersReal.js');
const { TF } = require('../../types/Timeframes.js');

const SETTINGS = require('../../../private/private.js');
//const PeriodTagsCompare = require('../../reports/PeriodTagsCompare.js');

class OrdersManager {
    
    static LIMIT_ORDER_TIMEOUT_CANDLES = 1;

    constructor(brokerUser, brokerCandles, clients) {

        this.emulator = new OrdersEmulator(brokerCandles);
        this.clients = clients;
        this.brokerCandles = brokerCandles;
        this.real = new OrdersReal(brokerUser, clients);
        this.ordersQueue = [];
        
        this.lastUpdateTime = null;
        this.previousHour = null;
        this.previousMinute = null;
    }

    reset() {
        this.lastUpdateTime = null;
        this.previousHour = null;
        this.previousMinute = null;
        this.emulator.reset();
        this.real.reset();
    }
    
    /* analyzers IO */

    getSymbolInfo(symbol) {
        return this.brokerCandles.getSymbolInfo(symbol);
    }

    queueOrder(params) {
        this.ordersQueue.push(params);
    }

    marketOrder(params) {
        /*{
            time,
            strategy,
            symbol,
            timeframe,
            isLong,
            entryPrice, 
            takeProfit, 
            stopLoss,
            comment,
            flags,
            candle 
        }*/

        params = this.adjustSLTP(params);
        if (! params ) { return null; }

        const isLive = flags.get('is_live');

        const emulatedEntry = this.emulator.marketEntry(params);
        if (! emulatedEntry ) { return null; }

        if ( isLive ) {
            /*
            if (emulatedEntry.tags && emulatedEntry.tags.CU5.value === 'Y') {
                this.doMakeEntryFromEmulated( emulatedEntry.id );
            }
            */
        }

        return emulatedEntry;
    }


    limitOrder( params ) {

        params = this.adjustSLTP(params);
        if (! params ) { return null; }
        
        const expire = params.time + OrdersManager.LIMIT_ORDER_TIMEOUT_CANDLES *
             TF.getTimeframeLength(params.timeframe);

        params.expire = expire;

        this.emulator.limitEntry( params );

        const isLive = params.flags.get('is_live');

        if ( isLive ) {
            // todo: limit real order
        }

    }




    /* candleProcessor io */

    processOrdersQueue() {
        this.ordersQueue.forEach( p => {
            if (p.isLimit) { this.limitOrder(p); }
            else { this.marketOrder(p); }
        });
        this.ordersQueue = [];
    }

    priceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice) {

        if ( this.isClockUpdated(eventTime)) { this.runSchedule(); }

        this.emulator.priceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice);
    }


    /* schedule */

    getLastUpdateTime()
    {
        return this.lastUpdateTime;
    }

    isClockUpdated(eventTime)
    {
        if ( ! this.lastUpdateTime || (eventTime > this.lastUpdateTime)) {      
            this.lastUpdateTime = eventTime;
            return true;
        }
        return false;
    }

    /* only run after updateClock == true */
    runSchedule() {

        const now = new Date(this.lastUpdateTime);
        const minute = Math.ceil(now.getTime() / 1000*60);
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

    scheduleHourly() {};
    scheduleMinutely() {}


    /* user interface io */
   
    getEntriesList()
    {
        return this.emulator.toGUI();
    }

    /*
    getEmulatedStatistics(fromTimestamp, toTimestamp) {
        return this.emulator.genStatistics(fromTimestamp, toTimestamp);
    }

    getReport(params)
    {

        return this.report.getReport(
                this.emulator.getOrders(),
                params.dateFrom,
                params.dateTo,
                params.interval,
                params.tag,
                params.tagValue,
                params.eval 
        );
    }
*/

    getEntry(entryId) {
        return this.emulator.getEntryById(entryId);
    }

/*

    async doMakeOrderFromEmulated(emulatedOrderId) {
        const emulatedOrder = this.emulator.getOrderById(emulatedOrderId);
        if (!emulatedOrder) { return; }

        if (emulatedOrder.isBroker()) {
            console.log('MAKE_EMULATE_ORDER: order already at broker!');
            return;
        }
    
        this.clients.onNewRealOrder(emulatedOrder);

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

    adjustSLTP(params)
    {
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
            console.log("BAD ORDER PARAMS: "+e.message);
            return null;
        }
    }

}



module.exports = OrdersManager;

