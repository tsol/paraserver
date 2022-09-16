/* 
** TickerBuffer - CandleSequencer helper responsible for cached candle supply for specific ticker
*/

const SETTINGS = require('../../../private/private.js');

class TickerBuffer {

    constructor(symbol,timeframe,candleProxy) {
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.candleProxy = candleProxy;
        this.buffer = [];
    }

    peekCandle() {
        if (this.buffer.length <= 0)
            { return null; }
        return this.buffer[0];
    }

    fetchCandles(closeTime) {
        // todo: optimize, in most cases fetched is only first element of buffer
        // in every case - its just first N elements of buffer.
        // (N>1 could only happen when sequencer pulseTime is greater than this timeframe
        // N==0 could happen if symbols hasnt been trading this time
        let fetched = [];
        const first = this.buffer[0];
        if (! first || first.closeTime > closeTime) { return []; }
        this.buffer.shift();
        return [ first ];
        //const fetched = this.buffer.filter( c => c.closeTime <= closeTime );
        //this.buffer = this.buffer.filter( c => c.closeTime > closeTime );
        //return fetched;
    }

    getSymbol() { return this.symbol };
    getTimeframe() { return this.timeframe; }

    async loadPeriod(timeFrom,timeEnd)
    {
        let useBroker = true;
        if ( SETTINGS.onlyLocalCandles ) { useBroker = false; }

        try {
            this.buffer = await this.candleProxy.
                getCandlesPeriod( this.symbol, this.timeframe, timeFrom, timeEnd, useBroker );
            return { res: true, symbol: this.symbol };
        }
        catch (error) {
            console.log('TBUF cought error: ', error);
            return { res: false, symbol: this.symbol };
        }
    }

 
}

module.exports = TickerBuffer;
