const TH = require('../../helpers/time.js');

class CandleProcessor {

    constructor() {
        this.isLive = false;
    }

    switchLive() {
        this.isLive = true;
        console.log('CPRO: switching live...');
    }

    /* priceUpdate
    **
    ** In-between phases live price update candles, stopLoss/takeProfit processing
    ** lowPrice and highPrice show how price deviated since last priceUpdate on
    ** this symbol (or last closed candle closeTime).
    **
    ** During history data priceUpdate is called on smallest timeframe close candle.
    **
    ** Note: on emulation its best to test your stopLosses first agains corresponding
    ** maximum and after that - takeProfit (to get honest worst case scenario)
    */ 
    priceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice) {

        console.log('CPRO: price update '+symbol+' ['+TH.ls(eventTime)+'/'+eventTime+'] '+
            lowPrice+'/'+highPrice+'/'+currentPrice);

        // todo: first priceUpdate after switching live must consider lowPrice and highPrice
    }

    processPhaseStart(candleCloseTime, passedTime) {
        // prepare for candleProcess
        console.log('CPRO: phase start '+TH.ls(candleCloseTime)+' passed: '+
            Number(passedTime/1000).toFixed(2)+' secs.');
    }

    processCandle(closedCandle) {
        // process closed candles
        console.log('CPRO: closed candle '+closedCandle.symbol+'-'+closedCandle.timeframe);
    }

    processPhaseEnd() {
        // process orders queue, arbitration
        //console.log('CPRO: phase end');
    }

}

module.exports = CandleProcessor;