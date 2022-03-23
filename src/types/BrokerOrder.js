const { TF } = require('./Timeframes');

class BrokerOrder {

    constructor({ symbol,isLong,entryPrice,usdAmount,stopLoss,takeProfit })
    {
        this.time = TF.currentTimestamp();
        this.symbol = symbol;
        this.isLong = isLong;
        this.entryPrice = entryPrice;
        this.usdAmount = usdAmount;
        this.stopLoss = stopLoss;
        this.takeProfit = takeProfit;
        this.quantity = 0;

        this.orders = {
            entry: { id: null },
            sl:    { id: null },
            tp:    { id: null }
        };
        
    }

    setQuantity(q) { this.quantity = q; }
    setOrders(orders) { this.orders = orders; }

}

module.exports = BrokerOrder;
