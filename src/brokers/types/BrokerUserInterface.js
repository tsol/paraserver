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
    ** quantity, stopLoss and takeProfit must be in correct prescision
    ** user must use align functions in candleSource
    **
    ** function must return structure:
    **  {   entry: { id: 10001 },
    **      sl:    { id: 10002 },
    **      tp:    { id: 10003 }  }
    */

    async makeMarketOrder(symbol,isLong,quantity,stopLoss,takeProfit){};
    
    /* must return: { balance: '23', pnl: '0.01', positions: } */
    async getAccountInformation(){};

    async closeOrderIds(symbol, orderIdsArray) {};
    async moveStopLoss(symbol, orderId, newPrice){};
    async moveTakeProfit(symbol, orderId, newPrice){};

    subscribe(subscriberObject) {}; /* must implement BrokerEventsUserInterface */
    
}

module.exports = BrokerUserInterface;