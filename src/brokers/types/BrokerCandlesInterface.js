/*
** Candle source broker interface. Use this interface to add sources for
** candles from any broker.
**
** Many clients can share one candle source instance, usually via CandleProxy
** class, which uses local database cache for history candles.
**
*/

class BrokerCandlesInterface {

    /* theese must return array of Candle objects (types/Candle.js) */
    async loadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp) {}
    async getTradableSymbols() {}

    /* subscriber must implement BrokerEventsCandles interface */
    subscribe(symbol, timeframe, subscriberObject) {}
    unsubscribe(symbol, timeframe, subscriberObject) {}
}

module.exports = BrokerCandlesInterface;

