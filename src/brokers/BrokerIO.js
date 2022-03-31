/* Interfaces for implementing broker */

class CandleSourceIO {

    hasSymbol(symbol) {}

    /* theese must return array of Candle objects (types/Candle.js) */
    async loadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp) {}
  
    async getTradableSymbols() {}

    /* after subscription 
    ** subscriberObject.newCandleFromBroker(candleObject)
    ** is called upon every new candle */
    subscribe(symbol, timeframe, subscriberId, subscriberObject) {}
    unsubscribe(symbol, timeframe, subscriberId) {}
}


class BrokerOrdersIO {

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
    
    /* must return: { balance: '23', pnl: '0.01' } */
    async getBalance(){};

    async closeOrderIds(symbol, orderIdsArray) {};
    async moveStopLoss(symbol, orderId, newPrice){};
    async moveTakeProfit(symbol, orderId, newPrice){};


    addEventProcessor(object) {};
    getClient() { return null; };
    
}


module.exports = { CandleSourceIO, BrokerOrdersIO }
