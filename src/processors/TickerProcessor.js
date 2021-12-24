const AnExtremum = require('../analayzers/AnExtremum.js');
const AnHLTrend = require('../analayzers/AnHLTrend.js');
const AnVLevels = require('../analayzers/AnVLevels.js');
const AnATR = require('../analayzers/AnATR.js');
const AnMA = require('../analayzers/AnMA.js');
const AnCandlePatterns = require('../analayzers/AnCandlePatterns.js');
const AnDoubleBottom = require('../analayzers/AnDoubleBottom.js');
const AnHills = require('../analayzers/AnHills.js');

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

    getState() {
       return {
            'id': this.getId(),
            'symbol': this.symbol,
            'timeframe': this.timeframe,
            'limit': this.limit,
            'batchLoaded': this.isLive, /* todo: deal with it */
            'flags': this.flags.allFlags(this.getId())
       };
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

    processCandle(candle) {        
        

    }
 
    getChart() {
        return {
            id: this.getId(),
            candles: this.candles,
            flags: this.currentFlags
        }
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
