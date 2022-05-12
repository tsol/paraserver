
class CandleProcessor {

    static FETCH_TIMEOUT = 10000;

    constructor(candleProxy, symbols, timeframes, timeStart, timeEnd) {
        this.candleProxy = candleProxy;
        this.symbols = symbols;
        this.timeframes = timeframes;
        this.timeStart = timeStart;
        this.timeEnd = timeEnd;
    
        this.tickerBuffers = [];
    }




}

module.exports = TickerBuffer;