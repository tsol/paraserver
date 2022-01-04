const AnExtremum = require('../analayzers/AnExtremum.js');
const AnHLTrend = require('../analayzers/AnHLTrend.js');
const AnVLevels = require('../analayzers/AnVLevels.js');
const AnATR = require('../analayzers/AnATR.js');
const AnMA = require('../analayzers/AnMA.js');
const AnCandlePatterns = require('../analayzers/AnCandlePatterns.js');
const AnDoubleBottom = require('../analayzers/AnDoubleBottom.js');
const AnHills = require('../analayzers/AnHills.js');
const AnTouchMA = require('../analayzers/AnTouchMA.js');

const { TF } = require('../types/Timeframes.js');


class TickerProcessor {

    constructor(symbol,timeframe,limit,flags,ordersManager) {
    
        this.ordersManager = ordersManager;
        this.flags = flags;
        
        this.candles = [];
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.limit = limit;

        this.isLive = false;
   
        this.analyzers = [];
        this.analyzers.push(new AnExtremum());
        this.analyzers.push(new AnHLTrend());
        this.analyzers.push(new AnATR(14));
        this.analyzers.push(new AnMA('c',20));
        this.analyzers.push(new AnHills());
        this.analyzers.push(new AnVLevels(limit));
        this.analyzers.push(new AnCandlePatterns());
        this.analyzers.push(new AnDoubleBottom());
        this.analyzers.push(new AnTouchMA());                
    }

    setLive()
    {
        this.isLive = true;
    }

    setFlagsObject(flagsObject) {
        this.flags = flagsObject;
    }

    getId() {
        return this.symbol+'-'+this.timeframe;
    }

    getCurrentPrice()  {
        if (this.candles.length < 1) {
            console.error('no candles to get current price');
            return 0;
        }
        const lastCandle = this.candles[this.candles.length - 1];
        return lastCandle.close;
    }

    peekCandle(candle) {
        this.ordersManager.priceUpdated(candle.symbol, candle.timeframe, candle.close, this.isLive);
    }

    addCandle(candle)
    {
        if (!candle.closed) {
            return this.peekCandle(candle);
        }

        this.candles.push(candle);

        while (this.candles.length > this.limit) {
            this.forgetFirstCandle();
        }

        this.flags.start(this.symbol, this.timeframe);

        this.analyzers.forEach( (analayzer) => {
            analayzer.addCandle(candle, this.flags);
        });

        this.ordersManager.lowestPriceOnClose(candle.symbol, candle.timeframe, candle.low, this.isLive);
        this.ordersManager.highestPriceOnClose(candle.symbol, candle.timeframe, candle.high, this.isLive);
        
        const newEntry = this.flags.get('entry');
        if (newEntry) {
            const currentFlags = this.flags.allFlags(this.getId());
            newEntry.flags = JSON.parse(JSON.stringify(currentFlags));
            this.ordersManager.newEntry(newEntry,this.isLive);
        }
        
        // in future: updateEntry

    }

    /* broker IO */
    newCandleFromBroker(candle) {
        //console.log('TP: candle from broker '+candle.getId());
        this.addCandle(candle);
    }

    forgetFirstCandle() {
        const firstCandle = this.candles.shift();
        
        this.analyzers.forEach( (analayzer) => {
            analayzer.forgetBefore(firstCandle.openTime);
        });

    }

    getState() {
        return {
             'id': this.getId(),
             'symbol': this.symbol,
             'timeframe': this.timeframe,
             'limit': this.limit
        };
     }
 
    getChart(limit, targetTimestamp) {
        
        const currentTimestamp = TF.currentTimestamp();
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
            targetTimestamp: (wasTarget ? targetTimestamp : null),
            flags: this.flags.allFlags(this.getId())
        }
    }


    getFirstTimestamp() {
        if (this.candles.length == 0) {
            return null;
        }
        return this.candles[0].openTime;
    }

/*
    reset() {
        console.log('TP: full reset');
        this.candles = [];
        this.resetAnalyzers();
    }

    resetAnalyzers() {
        this.analyzers.forEach( analayzer => analayzer.reset() );
    }
*/

}

module.exports = TickerProcessor;
