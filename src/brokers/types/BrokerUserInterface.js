/*
** User related broker functions (make order, wallet balance, set take profit etc.)
** Use this interface to implement connections to any broker. Make sure to
** implement candle source connection as well.
**
** Each client must use instance of such object to manage his account.
**
*/

class BrokerUserInterface {

    async init() {};

    /* make entry on current market price with take profit and stop loss set
    ** must return structure:
        {
            quantity: 0,
            orders: {
                entry: { id: null },
                sl:    { id: null },
                tp:    { id: null }
            }
        }
    */
    async makeFullOrder(symbol,isLong,entryPrice,usdAmount,stopLoss,takeProfit){};
    
    /*
        return correct prescision prices and quantity
    return {
        quantity: 0,
        stopLoss: 0,
        takeProfit: 0
    };
    */
    getAlignedOrderDetails(symbol,entryPrice,usdAmount,stopLoss,takeProfit){};


    /* must return: { balance: '23', pnl: '0.01', positions: } */
    async getAccountInformation(){};

    async closeOrderIds(symbol, orderIdsArray) {};
    async moveStopLoss(symbol, orderId, newPrice){};
    async moveTakeProfit(symbol, orderId, newPrice){};

    getSymbolInfo(symbol){};  // { qtyPrecision, pricePrecision, minQty, tickSize };

    addEventProcessor(object) {};
    getClient() { return null; };
    
}

module.exports = BrokerUserInterface;