/*
** Candle source broker interface. Use this interface to add sources for
** candles from any broker.
**
** Many clients can share one candle source instance, usually via CandleProxy
** class, which uses local database cache for history candles.
**
*/

class BrokerCandlesInterface {

    /* array of symbols on this broker */
    async getTradableSymbols() {}

    /* must return array of Candle objects (types/Candle.js) */
    async loadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp) {}
 
    /*
    ** return correct prescision prices and quantity:
    **    { quantity: 2.0, stopLoss: 1.254, takeProfit: 1.384 }
    */
    getAlignedEntryDetails(symbol,entryPrice,usdAmount,stopLoss,takeProfit){};
    getSymbolInfo(symbol){};  // { qtyPrecision, pricePrecision, minQty, tickSize };

    /* subscriber must implement BrokerEventsCandles interface */
    subscribe(symbol, timeframe, subscriberObject) {}
    unsubscribe(symbol, timeframe, subscriberObject) {}
}

module.exports = BrokerCandlesInterface;

