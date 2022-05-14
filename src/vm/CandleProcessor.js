
class CandleProcessor {

    constructor() {}

    processUpdate(unclosedCandle) {
        // in-between phases live price update candles, stopLoss/takeProfit processing
    }

    processPhaseStart(timestamp) {
        // prepare for candleProcess (empty orders queue?)
    }

    processCandle(closedCandle, isLive) {
        // process closed candles
    }

    processPhaseEnd() {
        // process orders queue, arbitration
    }

}

module.exports = TickerBuffer;