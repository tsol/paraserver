
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
 

    getChart(limit, targetTimestamp) {
        
        const currentTimestamp = this.getLastTimestamp();
        const firstTimestamp = this.getFirstTimestamp();

        if (! firstTimestamp) {
            return null;
        }
        let wasTarget = true;
        if (! targetTimestamp) { targetTimestamp = currentTimestamp; wasTarget=false; }
        if (! limit ) { limit = 1000; }
        
        const tfLen = TF.getTimeframeLength(this.timeframe);
        const periodLen = tfLen * limit;
        const halfPeriod = Math.floor(periodLen/2);

        let endTimestamp = targetTimestamp + halfPeriod;
        let startTimestamp = targetTimestamp - halfPeriod;

        // shift limit right 
        if (startTimestamp < firstTimestamp) {
            const diff = firstTimestamp - startTimestamp;
            startTimestamp = firstTimestamp;
            endTimestamp += diff;
        }
        // shift limit left
        if (endTimestamp > currentTimestamp) {
            const diff = endTimestamp - currentTimestamp;
            endTimestamp = currentTimestamp;
            startTimestamp -= diff;
        }

        // truncate left wing (less than limit return) 
        if (startTimestamp < firstTimestamp) {
            startTimestamp = firstTimestamp;
        }

        return {
            id: this.getId(),
            candles: this.candles.filter(
                 c => (c.openTime >= startTimestamp) && (c.closeTime <= endTimestamp)
            ),
            targetTimestamp: (wasTarget ? targetTimestamp : null)
        }
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
