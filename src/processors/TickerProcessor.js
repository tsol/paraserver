const AnExtremum = require('../analayzers/AnExtremum.js');
const AnHLTrend = require('../analayzers/AnHLTrend.js');
const AnLevels = require('../analayzers/AnLevels.js');
const AnATR = require('../analayzers/AnATR.js');
const AnMA = require('../analayzers/AnMA.js');
const AnCandlePatterns = require('../analayzers/AnCandlePatterns.js');

class TickerProcessor {

    constructor(symbol,timeframe,limit) {
    
        this.candles = [];
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.limit = limit;
        this.batchLoaded = false;
        this.currentFlags = [];

        this.analyzers = [];
        this.analyzers.push(new AnExtremum());
        this.analyzers.push(new AnHLTrend());
        this.analyzers.push(new AnLevels());
        this.analyzers.push(new AnATR(14));
        this.analyzers.push(new AnMA('c',9));
        this.analyzers.push(new AnCandlePatterns());
        
    }

    getId() {
        return this.symbol+'-'+this.timeframe;
    }

    reset() {
        console.log('TP: full reset');
        this.candles = [];
        this.batchLoaded = false;
        this.resetAnalyzers();
    }

    /* until batchLoaded we just gather all candles in array waiting for
    ** history data to be loaded, while getting live updates from wss
    */
    addCandle(candle) {
        this.candles.push(candle);
        if (this.batchLoaded) {

            if (this.candles.length > 1) {
                let prevCandle = this.candles[ this.candles.length - 2];
                this.checkCandleConsistent(candle,prevCandle);
            }

            this.processCandle(candle);
        }
    }

    isBatchLoaded() {
        return this.batchLoaded;
    }

    /* when history data is ready and all candles added we
    ** filter unique, resort, and run process all candles
    */
    batchLoadFinished() {

        const candles = [];
        const uniqueId = {};

        /* filtering out duplicates from livestream and bulk history */
        let cnt = 0;
        this.candles.forEach( (candle) => {
            if (uniqueId[ candle.openTime ]) {
                console.log('TP: double candle filtered out.')
                return;
            }
            candle.count = cnt;
            cnt++;
            candles.push(candle);
            uniqueId[ candle.openTime ] = 1;
        });

        /* re-sort by open time */
        candles.sort((a, b) => (a.openTime > b.openTime) ? 1 : -1)

        /* reset all analyzers, in case of lost wss connection and reconnect */

        /* process all candles */
        this.candles = candles;
        this.timeConsistancyCheckAllCandles();
        this.candles.forEach( candle => this.processCandle(candle) );

        /* set flag, so all new added candles will be processed automatically */
        this.batchLoaded = true;
    }

    resetAnalyzers() {
        this.analyzers.forEach( analayzer => analayzer.reset() );
    }

    processCandle(candle) {
        
        console.log('TP: ('+this.getId()+') process candle:');
        console.log(candle);

        let combinedFlags = [];

        this.analyzers.forEach( (analayzer) => {
            analayzer.addCandle(candle, combinedFlags);
            let flags = analayzer.getFlags();
            combinedFlags = { ...combinedFlags, ...flags};
        });

        if (Object.keys(combinedFlags).length > 0) {
            console.log(combinedFlags);
        }

        this.currentFlags = combinedFlags;
    }    

    /* Now this is totally inapropriate check for non 24h brokers, because
    every GAP will fail this check. Also even binance closes on maintanence.
    So disable it altogether?
    */
    checkCandleConsistent(thisCandle,prevCandle)
    {
        let diff = thisCandle.openTime - prevCandle.closeTime;
        
        if ( (diff > 1) || (diff < 0) ) {
            
            console.log('ERROR: time consistancy check failed');

            console.log('Latest Candle');
            console.log(thisCandle);

            console.log('Previous Candle');
            console.log(prevCandle);
            //throw new Error('ERROR: time consistancy check failed diff='+diff);
        }

    }

    timeConsistancyCheckAllCandles()
    {
        let prevCandle = undefined;

        this.candles.forEach( (candle) => {
            if (prevCandle === undefined) {
                prevCandle = candle;
                return;
            }

            this.checkCandleConsistent(candle,prevCandle);
            prevCandle = candle;
        });

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
