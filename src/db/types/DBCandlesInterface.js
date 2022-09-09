
class DBCandlesInterface {

    // returns array of Candle objects
    async loadCandlesPeriod(symbol,timeframe,startTimestamp,endTimestamp) {}
    
    // saves array of Candle objects
    saveCandlesToDB(symbol,timeframe,candles) {}

}


module.exports = DBCandlesInterface;