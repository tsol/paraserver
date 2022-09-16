
const SETTINGS = require('../../../private/private.js');
const { TF } = require('../../types/Timeframes.js');


class TickerProcessor {

    constructor(symbol,timeframe,analyzersBox,candleDebug) {
        this.candles = [];
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.analyzersBox = analyzersBox;
        this.candleDebug = candleDebug;
        this.limit = TF.get(timeframe).limit;            
    }
   
    getId() {
        return this.symbol+'-'+this.timeframe;
    }

    // only used in dbl_bottom strategy
    getCandlesFrom(closeTime) {
        return this.candles.filter( c => c.closeTime > closeTime );
    }

    addCandle(candle,flags,isLive)
    {

        this.candles.push(candle);

        while (this.candles.length > this.limit) {
            this.forgetFirstCandle();
        }

        if (! this.analyzersBox ) { return; }

        flags.start(this.symbol, this.timeframe);
        flags.set('is_live', isLive);
    
        this.analyzersBox.addCandle(candle, flags);
        
    }

    forgetFirstCandle() {
        const firstCandle = this.candles.shift();
        if (this.analyzersBox ) {
            this.analyzersBox.forgetBefore(firstCandle.openTime);
            this.candleDebug.forgetBefore(this.symbol, this.timeframe, firstCandle.openTime);
        }
    }

    getState() {
        return {
             'id': this.getId(),
             'symbol': this.symbol,
             'timeframe': this.timeframe,
             'limit': this.limit,
             'isLive': false,
             'firstTimestamp': this.getFirstTimestamp(),
             'lastTimestamp': this.getLastTimestamp()
        };
     }
 
    getFirstTimestamp() {
        if (this.candles.length == 0) {
            return null;
        }
        return this.candles[0].openTime;
    }


    getLastTimestamp() {
        if (this.candles.length == 0) {
            return null;
        }
        return this.candles[this.candles.length - 1].closeTime;
    }


}

module.exports = TickerProcessor;
