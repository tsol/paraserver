const AnExtremum = require('../analayzers/AnExtremum.js');
const AnHLTrend = require('../analayzers/AnHLTrend.js');
const AnVLevels = require('../analayzers/AnVLevels.js');
const AnATR = require('../analayzers/AnATR.js');
const AnMA = require('../analayzers/AnMA.js');
const AnCandlePatterns = require('../analayzers/AnCandlePatterns.js');
const AnDoubleBottom = require('../analayzers/AnDoubleBottom.js');
const AnHills = require('../analayzers/AnHills.js');

class TickerProcessor {

    constructor(symbol,timeframe,limit,flags) {
    
        this.flags = flags;

        this.candles = [];
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.limit = limit;
   
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

    getId() {
        return this.symbol+'-'+this.timeframe;
    }

    getState() {
       return {
            'id': this.getId(),
            'symbol': this.symbol,
            'timeframe': this.timeframe,
            'limit': this.limit,
            'batchLoaded': false, /* todo: deal with it */
            'flags': this.flags.allFlags(this.getId())
       };
    }

    reset() {
        console.log('TP: full reset');
        this.candles = [];
        this.resetAnalyzers();
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
        
    }

    addCandle(candle) {
        this.candles.push(candle);
        while (this.candles.length > this.limit) {
            this.forgetFirstCandle();
        }
        this.processCandle(candle);
    }

    forgetFirstCandle() {
        const firstCandle = this.candles.shift();
        
        this.analyzers.forEach( (analayzer) => {
            analayzer.forgetBefore(firstCandle.openTime);
        });

    }

    processCandle(candle) {
        
        this.flags.start(this.symbol, this.timeframe);

        this.analyzers.forEach( (analayzer) => {
            analayzer.addCandle(candle, this.flags);
            //this.flags.merge( analayzer.getFlags() );
        });

    }

   
    resetAnalyzers() {
        this.analyzers.forEach( analayzer => analayzer.reset() );
    }

    getChart() {
        return {
            id: this.getId(),
            candles: this.candles,
            flags: this.currentFlags
        }
    }

}

module.exports = TickerProcessor;
