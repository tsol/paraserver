const OrdersEmulator = require('./OrdersEmulator.js');
const OrdersReal = require('./OrdersReal.js');

class OrdersManager {
    
    constructor(brokerOrderClient) {
        this.emulator = new OrdersEmulator();
        this.real = new OrdersReal(brokerOrderClient);
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

/*
        const realOrder = this.real.newOrder(
            type,
            flags, 
            strategyObject, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            symbol,
            timeframe,
            time,
            comment,
            emulatedOrder
        );
*/

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
        if (emulatedOrder) {
            const realOrder = this.real.newOrderFromEmu(emulatedOrder);
            if (realOrder) {
                emulatedOrder.comment += ' [BROK]';
                return realOrder;
            }
        }
        return null;
    }

}



module.exports = OrdersManager;

