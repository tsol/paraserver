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

const TickerBuffer = require('./TickerBuffer.js');

const TH = require('../helpers/time.js');
const LivePulser = require('./LivePulser');
const { TF } = require('../types/Timeframes.js');


class CandleSequencer {

    constructor(symbols,timeframes,candleProxy,candleProcessor) {
        
        this.modeLive = false; // after history load we want to run live
        this.isLive = false;   // current state

        this.symbols = symbols;
        this.timeframes = timeframes;
        this.candleProxy = candleProxy;
        this.candleProcessor = candleProcessor;
        
        this.pulser = null;
        this.livePulseCache = [];
        this.lastPulseTime = null;

        this.tbuffers = [];

        this.pulseTF = this.getSmallestTimeframe();

    }

    getIsLive() {
        return this.isLive;
    }


/*
1. if modeLive == true (after history load wants to run live)
   TickerBuffers subscribe to live candles stream
   sequencer subscribe to live candles stream

2. load all history data into TickerBuffers

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

    async init(timeStart, timeEnd) {

        const brokerCandles = this.candleProxy.getBroker();

        if (! timeEnd) {
            this.modeLive = true;
            this.pulser = new LivePulser(symbols,timeframes,this);
            timeEnd = (new Date()).getTime();
        }
        
        for (var s of this.symbols) {
            for (var t of this.timeframes) {
                const tbuf = new TickerBuffer(s,t,this.candleProxy);
                this.tbuffers.push(tbuf);
                if (this.modeLive) {
                    brokerCandles.subscribe(s,t,this.pulser);
                }
            }
        }

        let historyLoadStats = await this.loadHistory(timeStart,timeEnd);
        
        // cleanup failed to load symbols:
        let symbolsToRemove = {};
        historyLoadStats.filter( s => !s.res ).forEach( s => symbolsToRemove[s.symbol]=1 );
        Object.keys(symbolsToRemove).forEach( sr => this.removeSymbol(sr));

        this.processHistory();

        if (this.modeLive) {
            this.livePulseCache.forEach( p => this.processLivePulse(p.closeTime,p.arrived) );
            this.isLive = true;
            this.candleProcessor.switchLive();
        }

    }

    getSmallestTimeframe()
    {
        return this.timeframes.sort( (a,b) => TF.get(a).length - TF.get(b).length )[0];
    }

    getHistoryPulseBuffer()
    {
        for (var tb of this.tbuffers) {
            if (tb.getTimeframe() == this.pulseTF) {
                return tb;
            }
        }

        throw new Error('CSEQ: could not find pulse buffer: '+this.pulseTF);        
    }

    // todo: split history process, using setImmediate block 
    processHistory()
    {
        if (this.tbuffers.length <= 0) {
            console.log('CSEQ: no history to process'); 
            return;
        }

        const pulseBuffer = this.getHistoryPulseBuffer();
        let pc = pulseBuffer.peekHistoryCandle(); // pulse candle

        while (pc) {
            this.lastPulseTime = pc.closeTime;

            console.log('CSEQ: pulse ['+TH.ls(pc.openTime)+' - '+TH.ls(pc.closeTime)+']');

            this.candleProcessor.processPhaseStart(this.lastPulseTime);

            for (var tb of this.tbuffers) {
                //console.log(' * '+tb.getSymbol()+'-'+tb.getTimeframe());
                tb.fetchHistoryCandles(this.lastPulseTime).forEach( c => 
                    this.candleProcessor.processCandle(c)
                );
            }

            this.candleProcessor.processPhaseEnd();

            pc = pulseBuffer.peekHistoryCandle();
        }

    }


    loadHistory(timeStart,timeEnd) {
        let loadResults = [];
        for (var tbuf of this.tbuffers) {
            loadResults.push( tbuf.loadPeriod(timeStart,timeEnd));
        }
        return Promise.all(loadResults);
    }


    removeSymbol(symbol) {
        console.log('CSEQ: removing symbol '+symbol);

        if (this.modeLive) { // unsubscribe from live candle stream
            const brokerCandles = this.candleProxy.getBroker();
            for (var tb of this.tbuffers) {
                if (tb.getSymbol() == symbol) {
                    brokerCandles.unsubscribe(symbol,tb.getTimeframe(),this.pulser);
                }
            }
        }

        this.symbols = this.symbols.filter( s => s !== symbol );
        this.tbuffers = this.tbuffers.filter( tb => tb.getSymbol() !== symbol );
    }


    livePriceUpdate(unclosedCandle,eventTime) {
        if (this.isLive) {
            this.candleProcessor.priceUpdate(
                unclosedCandle.symbol,
                unclosedCandle.openTime,
                eventTime,
                unclosedCandle.low,
                unclosedCandle.high,
                unclosedCandle.close
            );
        }
    }

    livePulse(closeTime, arrived, missed) {

        const missedTickers = Object.keys(missed);
        
        if (missedTickers.length>0) {
            missedTickers.forEach( key => {
                this.removeSymbol( key.split('-')[0] );
            });
            this.pulser.updateSymbols(this.symbols);
        }

        if (! this.isLive ) {

            this.livePulseCache.push({
                closeTime, arrived
            });

            return;
        }

        this.processLivePulse(closeTime,arrived);
    }

    processLivePulse(closeTime,arrived)
    {
        if (closeTime <= this.lastPulseTime) {
            console.log('CSEQ: skipping pulse '+TH.ls(closeTime));
            return;
        }

        this.lastPulseTime = closeTime;
        this.candleProcessor.processPhaseStart(this.lastPulseTime);

        for(var s of this.symbols) {
            for (var t of this.timeframes) {
                const candle = arrived[s+'-'+t];
                if (candle) {
                    this.candleProcessor.processCandle(candle)
                }
            }
        }

        this.candleProcessor.processPhaseEnd();

    }



/*
    function ensureFooIsSet(timeout) {
        var start = Date.now();
        return new Promise(waitForFoo); 
        
        function waitForFoo(resolve, reject) {
            if (window.lib && window.lib.foo)
                resolve(window.lib.foo);
            else if (timeout && (Date.now() - start) >= timeout)
                reject(new Error("timeout"));
            else
                setTimeout(waitForFoo.bind(this, resolve, reject), 30);
        }
    }
*/



}


module.exports = CandleSequencer