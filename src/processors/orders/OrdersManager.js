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
        this.brokerUser = brokerUser;
        this.brokerCandles = brokerCandles;
        this.real = new OrdersReal(brokerUser, clients);
    }

    reset() {
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
            flags,
            this.brokerUser 
        );

        if (! emulatedOrder ) { return null; }

        if ( isLive ) {
            if (emulatedOrder.tags && emulatedOrder.tags.CU5.value === 'Y') {
                this.doMakeOrderFromEmulated( emulatedOrder.id );
            }
        }

        return emulatedOrder;
    }

    /* ticker io */

    pulseCandle(candle,isLive) {
        this.emulator.pulseCandle(candle,isLive);
    }

    candleClosed(candle,isLive) {
        this.emulator.candleClosed(candle,isLive);
        this.real.candleClosed(candle,isLive);
    }

    candleUpdated(candle,isLive) {
        this.emulator.candleUpdated(candle,isLive);
        this.real.candleUpdated(candle,isLive);
    }

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

    doMakeOrderFromEmulated(emulatedOrderId) {
        const emulatedOrder = this.emulator.getOrderById(emulatedOrderId);
        if (!emulatedOrder) { return; }

        if (emulatedOrder.isBroker()) {
            console.log('MAKE_EMULATE_ORDER: order already at broker!');
            return;
        }
    
        this.clients.onNewRealOrder(emulatedOrder);

        if ( SETTINGS.dev ) {
            return;
        }

        this.real.newOrderFromEmu(emulatedOrder).then((result) => {
            emulatedOrder.setComment(' [BROK] '+JSON.stringify(result));
            // todo: save to db
        }).catch( (err) => {
            console.log('MAKE_EMULATE_ORDER: ERROR');
            console.log(err);
            emulatedOrder.setComment(' [BRER] '+err.message);
        });

    }


}



module.exports = OrdersManager;

