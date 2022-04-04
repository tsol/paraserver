const OrdersEmulator = require('./OrdersEmulator.js');
const OrdersReal = require('./OrdersReal.js');
const { TF } = require('../../types/Timeframes.js');

const SETTINGS = require('../../../private/private.js');
const PeriodTagsCompare = require('../../reports/PeriodTagsCompare.js');

class OrdersManager {
    
    constructor(brokerOrderClient, webClients) {
        this.emulator = new OrdersEmulator();
        this.report = new PeriodTagsCompare();
        this.webClients = webClients;
        this.real = new OrdersReal(brokerOrderClient, webClients);
    }

    reset() {
        this.emulator.reset();
        this.real.reset();
    }
    
    /* called by analyzers through helper */
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

        if (! SETTINGS.dev) {
            if (isLive && emulatedOrder.tags )
            {
                if (emulatedOrder.tags && emulatedOrder.tags.CU2.value === 'Y') {
                    this.doMakeOrderFromEmulated( emulatedOrder.id );
                }
            }
        }

        return emulatedOrder;
    }

    /* ticker io */
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

/*
        return [
            ... this.report.getReport(this.emulator.getOrders(), 'm', 'CU', 'Y'),
            ... this.report.getReport(this.emulator.getOrders(), 'm', 'fp', '_F'),
            ... this.report.getReport(this.emulator.getOrders(), 'm', 'CU2', 'Y'),
        ]
*/

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
    
        this.real.newOrderFromEmu(emulatedOrder).then((result) => {
            emulatedOrder.setComment(' [BROK] '+JSON.stringify(result));
            // todo: save to db
            this.webClientsRefreshOrders();
        }).catch( (err) => {
            console.log('MAKE_EMULATE_ORDER: ERROR');
            console.log(err);
            
            emulatedOrder.setComment(' [BRER] '+err.message);
            this.webClientsRefreshOrders();
        });

    }


    /* helpers */

    webClientsRefreshOrders()
    {
        this.webClients.emit('orders',this.getEmulatedOrdersList());
    }


}



module.exports = OrdersManager;

