const OrdersEmulator = require('./OrdersEmulator.js');
const OrdersReal = require('./OrdersReal.js');
const { TF } = require('../../types/Timeframes.js');

const SETTINGS = require('../../../private/private.js');
const PeriodTagsCompare = require('../../reports/PeriodTagsCompare.js');

class OrdersManager {
    
    constructor(brokerUser, brokerCandles, clients) {
        this.emulator = new OrdersEmulator(brokerCandles);
        this.report = new PeriodTagsCompare();
        this.clients = clients;
        this.brokerCandles = brokerCandles;
        this.real = new OrdersReal(brokerUser, clients);
        
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

    newOrder(
        time,
        strategy,
        symbol,
        timeframe,
        isLong,
        entryPrice, 
        takeProfit, 
        stopLoss,
        comment,
        flags 
    ) {
        const isLive = flags.get('is_live');

        const emulatedOrder = this.emulator.newOrder(
            time,
            strategy,
            symbol,
            timeframe,
            isLong,
            entryPrice, 
            takeProfit, 
            stopLoss,
            comment,
            flags
        );

        if (! emulatedOrder ) { return null; }

        if ( isLive ) {
            if (emulatedOrder.tags && emulatedOrder.tags.CU5.value === 'Y') {
                this.doMakeOrderFromEmulated( emulatedOrder.id );
            }
        }

        return emulatedOrder;
    }


    /* candleProcessor io */

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
        if (eventTime > this.lastUpdateTime) {      
            this.lastUpdateTime = newTime;
            return true;
        }
        return false;
    }

    /* only run after updateClock == true */
    runSchedule() {

        const now = new Date(this.lastUpdateTime);
        const hour = now.getHours();
        const minute = now.getMinutes();

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
   
    getEmulatedOrdersList()
    {
        return this.emulator.toJSON();
    }

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

    getEmulatedOrder(orderId) {
        return this.emulator.getOrderById(orderId);
    }

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


}



module.exports = OrdersManager;

