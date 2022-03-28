const OrdersEmulator = require('./OrdersEmulator.js');
const OrdersReal = require('./OrdersReal.js');

const SETTINGS = require('../../../private/private.js');


class OrdersManager {
    
    constructor(brokerOrderClient, clients) {
        this.emulator = new OrdersEmulator();
        this.clients = clients;
        this.real = new OrdersReal(brokerOrderClient, clients);
    }

    reset() {
        this.emulator.reset();
        this.real.reset();
    }
    
    /* called by analyzers through helper */
    newOrder(
            type,
            flags, 
            strategyObject, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            symbol,
            timeframe,
            time,
            comment
    ) {

        const emulatedOrder = this.emulator.newOrder(
            type,
            flags, 
            strategyObject, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            symbol,
            timeframe,
            time,
            comment
        );

        if (! SETTINGS.dev) {
            if (emulatedOrder.tags && flags.get('is_live'))
            {
                //if (emulatedOrder.tags.fp && emulatedOrder.tags.fp.value === '_F') {
                if (emulatedOrder.tags.fp && emulatedOrder.tags['6H'].value === 'Y') {
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

    getEmulatedOrder(orderId) {
        return this.emulator.getOrderById(orderId);
    }

    doMakeOrderFromEmulated(emulatedOrderId) {
        const emulatedOrder = this.emulator.getOrderById(emulatedOrderId);
        if (!emulatedOrder) { return; }

        if (emulatedOrder.real) {
            console.log('MAKE_EMULATE_ORDER: order already real!');
            return;
        }
    
        this.real.newOrderFromEmu(emulatedOrder).then((result) => {
            emulatedOrder.comment += ' [BROK] '+JSON.stringify(result);
            this.clientsRefreshOrders();
        }).catch( (err) => {
            console.log('MAKE_EMULATE_ORDER: ERROR');
            console.log(err);
            emulatedOrder.comment += ' [BRER] '+err.message;
            this.clientsRefreshOrders();
        });

    }


    /* helpers */

    clientsRefreshOrders()
    {
        this.clients.emit('orders',this.getEmulatedOrdersList());
    }


}



module.exports = OrdersManager;

