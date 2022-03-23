class OrdersReal {
    
    constructor(broker) {
        this.broker = broker;
    }

    reset() {
    }
    
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
    }

    newOrderFromEmu(emulatedOrder) {
        return { dah: true };
    }


    candleClosed(candle,isLive) {
    }

    candleUpdated(candle,isLive) {
    }


}

module.exports = OrdersReal;

