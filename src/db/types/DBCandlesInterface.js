
class DBCandlesInterface {

    // returns array of Candle objects
    async loadCandlesPeriod(symbol,timeframe,startTimestamp,endTimestamp) {}
    
    // saves array of Candle objects
    async saveCandlesToDB(symbol,timeframe,candles) {}

    async getFirstCandle(symbol,timeframe) {};
    async getLastCandle(symbol,timeframe) {};

}


module.exports = DBCandlesInterface;