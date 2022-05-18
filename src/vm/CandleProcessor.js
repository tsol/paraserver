const TH = require('../helpers/time.js');

class CandleProcessor {

    constructor() {
        this.isLive = false;
    }

    switchLive() {
        this.isLive = true;
        console.log('CPRO: switching live...');
    }

    priceUpdate(symbol,fromTime,toTime,lowPrice,highPrice,currentPrice) {
        // in-between phases live price update candles, stopLoss/takeProfit processi
        // todo: keep current unclosed highs and lows for symbol
        console.log('CPRO: price update ['+TH.ls(fromTime)+'-'+TH.ls(toTime)+'] '+
            lowPrice+'/'+highPrice+'/'+currentPrice);
    }

    processPhaseStart(timestamp) {
        // prepare for candleProcess (empty orders queue?)
        console.log('CPRO: phase start '+TH.ls(timestamp));
    }

    processCandle(closedCandle) {
        // process closed candles
        console.log('CPRO: candle '+closedCandle.symbol+'-'+closedCandle.timeframe);
    }

    processPhaseEnd() {
        // process orders queue, arbitration
        console.log('CPRO: phase end');
    }

}

module.exports = CandleProcessor;