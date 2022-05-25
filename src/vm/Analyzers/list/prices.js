/*
**  Latest N exact prices for fast query
**
*/
const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');
const EMA = require('../helpers/EMA.js');

class PRICES extends Analyzer {

    static DEFAULT_MAX_CANDLES = 100;

    constructor({maxCandles}) 
    {
        super();
        this.maxCandles = ( maxCandles || PRICES.DEFAULT_MAX_CANDLES);
        this.resetFinder();
    }

    resetFinder() {
        this.highs = [];
        this.lows = [];
        this.prevCandle = null;
    }

    getId() { return 'prices'; }

    addCandle(candle,flags) {
        super.addCandle(candle,flags);
        CDB.setSource(this.getId());

        if (this.prevCandle) {

            this.highs.push( this.prevCandle.high );
            if (this.highs.length > this.maxCandles)
                { this.highs.shift(); }

            this.lows.push( this.prevCandle.low );
            if (this.lows.length > this.maxCandles)
                { this.lows.shift(); }
        }
        
        this.prevCandle = candle;

        flags.set(this.getId(), this);
    }

    findPrice(price)
    {
        //return this.highs.includes(price) || this.lows.includes(price);

        let timesHigh = 0;
        let timesLow = 0;
        
        if (this.highs.includes(price)) {
            timesHigh = this.highs.reduce( (p, c) => { return p + ( c==price ? 1 : 0 ); }, 0);
        }

        if (this.lows.includes(price)) {
            timesLow = this.lows.reduce( (p, c) => { return p + ( c==price ? 1 : 0 ); }, 0);
        }

        let timesTotal = timesLow + timesHigh;
        
        return {
            times: timesTotal,
            low: timesLow,
            high: timesHigh
        };
     
    }


    
}

module.exports = PRICES;

