/* 
** TickerBuffer - responsible for cached candle supply for specific ticker
**
**
*/

class TickerBuffer {

    constructor(symbol,timeframe,candleProxy) {
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.candleProxy = candleProxy;
        this.buffer = [];
    }

    peekHistoryCandle() {
        if (this.buffer.length <= 0)
            { return null; }
        return this.buffer[0];
    }

    fetchHistoryCandles(closeTime) {
        // todo: optimize
        const fetched = this.buffer.filter( c => c.closeTime <= closeTime );
        this.buffer = this.buffer.filter( c => c.closeTime > closeTime );
        return fetched;
    }

    getSymbol() { return this.symbol };
    getTimeframe() { return this.timeframe; }

    async loadPeriod(timeFrom,timeEnd)
    {
        try {
            this.buffer = await this.candleProxy.
                getCandlesPeriod( this.symbol, this.timeframe, timeFrom, timeEnd, true );
            return { res: true, symbol: this.symbol };
        }
        catch (error) {
            console.log('TBUF cought error: '+error.message);
            return { res: false, symbol: this.symbol };
        }
    }

 
}

module.exports = TickerBuffer;
