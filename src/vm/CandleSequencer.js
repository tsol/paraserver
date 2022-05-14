
/*
** Sequencer retreives candles from candleProxy, waits for all symbols/timeframes
** to arrive, then runs them agains candleProcessor in orderly fashion:
**
** 1. Higher timeframes candles processed first.
** 2. Symbols processed according to their position in symbols array
** (usually Bitcoin is first in array so altcoin analyzers can use its current state)
**

candleProcessor must implement:

    processUpdate(unclosedCandle)

    processPhaseStart(timestamp)
    processCandle(closedCandle, isLive)
    processPhaseEnd()


*/

const BrokerEventsCandlesInterface = require('../brokers/types/BrokerEventsCandlesInterface.js');
const TickerBuffer = require('./TickerBuffer.js');

class CandleSequencer extends BrokerEventsCandlesInterface  {

    constructor(symbols,timeframes,candleProxy,candleProcessor) {
        
        this.modeLive = false;
        this.isLive = false;

        this.symbols = symbols;
        this.timeframes = timeframes;
        this.candleProxy = candleProxy;
        this.candleProcessor = candleProcessor; 

        this.tbuffers = [];

    }

    getIsLive() {
        return this.isLive;
    }

    init(timeStart, timeEnd) {

        if (! timeEnd) {
            this.modeLive = true;
        }
        
        for (var s of this.symbols) {
            for (var t of this.timeframes) {
                this.tbuffers.push(new TickerBuffer(s,t,this.candleProxy));
            }
        }

/*
1. load all history data into buffers
2. if modeLive == true
   TickerBuffer subscribe to liveCandles
   sequencer subscribe to liveCandles
3. if some tbuffers fails to load - exclude whole symbol from array
   (unsubscribe from liveCandles)
4. once all loaded (all promises returned) - 
5. process all buffers using pulse from first symbol - first timeframe
    firstTBuffer.peekCandle()
    for tbuffers.getCandle(beforeCloseTime of peeked candle)
    set processedCloseTime = close time;
6. once all candles processed if modeLive == true
    process all candles arrived during time we processed history candles:
    process all buffered sequences if processedCloseTime < sequenceCloseTime
    set isLive = true
    now sequencer->newCandleFromBroker processes candles right away (no buffer)
    
*/

    }



    subscribeToLiveCandles() {
        const brokerCandles = this.candleProxy.getBroker();
        for (var s of this.symbols) {
            for (var t of this.timeframes) {
                brokerCandles.subscribe(s,t,this);
            }
        }

    }

/* this is used to pulse data */
    newCandleFromBroker(candle) {

        if (! isLive) {
            // store sequence in buffer array
        }

    }



}


module.exports = CandleSequencer