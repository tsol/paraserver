/*
** Sequencer retreives candles from candleProxy, waits for all symbols/timeframes
** to arrive, then runs them agains candleProcessor in orderly fashion:
**
** 1. Higher timeframes candles processed first.
** 2. Symbols processed according to their position in symbols array
** (usually Bitcoin is first in array so altcoin analyzers can use its current state)
**

candleProcessor must implement:

    processUpdate(...params)

    processPhaseStart(timestamp)
    processCandle(closedCandle, isLive)
    processPhaseEnd()

TODO:
    4. check two simultanious vms with different or same symbols
    6. align days with UTC time
    8. split history load by days - fetch/process cycle
    9. maybe dont collect all priceUpdates during history load (only pulse timeframe candles)
*/

const TickerBuffer = require('./TickerBuffer.js');

const TH = require('../helpers/time.js');
const LivePulser = require('./LivePulser');
const { TF } = require('../types/Timeframes.js');


const { setImmediate, setTimeout } = require('node:timers/promises')

class CandleSequencer {

    static SPLIT_CANDLES = 1000;

    constructor(symbols,timeframes,candleProxy,candleProcessor) {
        
        this.modeLive = false; // after history load we want to run live
        this.isLive = false;   // current state

        this.symbols = symbols;
        this.timeframes = timeframes;
        this.candleProxy = candleProxy;
        this.candleProcessor = candleProcessor;
        
        this.pulser = null;
        this.lastPulseTime = null;

        this.tbuffers = [];
        this.lastPriceUpdate = {};

        this.pulseTF = timeframes.sort( (a,b) => TF.get(a).length - TF.get(b).length )[0];
        this.timeframes.sort( (a,b) => TF.get(b).length - TF.get(a).length );
        

    }

    getIsLive() {
        return this.isLive;
    }

    lastPriceUpdateReset(closedCandle)
    {
        this.lastPriceUpdate[ closedCandle.symbol ] = {
            cur: closedCandle.close,
            high: closedCandle.close,
            low: closedCandle.close
        };
    }

    lastPriceUpdateGetDiffs(unclosedCandle)
    {
        const c = unclosedCandle;

        let res = { cur: c.close, high: c.close, low: c.close }

        const prev = this.lastPriceUpdate[ c.symbol ];

        if (! prev ) {
            res.high = c.high;
            res.low = c.low; 
            this.lastPriceUpdate[ c.symbol ] = res;
            return res;
        }

        let wasChange = false;

        if (c.high > prev.high) {
            res.high = c.high;
            prev.high = c.high;
            wasChange = true;
        }

        if (c.low < prev.low) {
            res.low = c.low;
            prev.low = c.low;
            wasChange = true;
        }

        if (prev.cur !== c.close) {
            wasChange = true;
            prev.cur = c.close;
        }

        if (wasChange) {
            return res;
        }

        return null;

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
            this.pulser = new LivePulser(this.symbols,this.timeframes,this.pulseTF,this);
            timeEnd = (new Date()).getTime();
        }
        
        for (var s of this.symbols) {
            for (var t of this.timeframes) {
                const tbuf = new TickerBuffer(s,t,this.candleProxy);
                this.tbuffers.push(tbuf);
                console.log('CSEQ: add tbuffer '+s+'-'+t);
                if (this.modeLive) {
                    brokerCandles.subscribe(s,t,this.pulser);
                }
            }
        }

        let historyLoadStats = await setImmediate(this.loadHistory(timeStart,timeEnd));
        
        // cleanup failed to load symbols:
        let symbolsToRemove = {};
        historyLoadStats.filter( s => !s.res ).forEach( s => symbolsToRemove[s.symbol]=1 );
        Object.keys(symbolsToRemove).forEach( sr => this.removeSymbol(sr));

        await setImmediate(this.processHistory());

        this.tbuffers = [];

        await setTimeout(70000);

        console.log('CSEQ: history done');

        if (this.modeLive) {
            this.pulser.switchLive();
            this.candleProcessor.switchLive();
            this.isLive = true;
        }

    }

 
    destroy() {
        this.isLive = false;

        const brokerCandles = this.candleProxy.getBroker();
        
        if (this.modeLive) {
            for (var s of this.symbols) {
                for (var t of this.timeframes) {
                    brokerCandles.unsubscribe(s,t,this.pulser);
                }
            }
        }

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


    async processHistoryPart()
    {
        console.log('CSEQ: process history part... ('+TH.ls(this.lastPulseTime)+')');

        let pc = this.pulseBuffer.peekHistoryCandle(); // pulse candle
        let count = 0;

        let closedCandles = [];
        let priceUpdates = [];

        while (pc) {
            this.lastPulseTime = pc.closeTime;

            console.log('CSEQ: pulse ['+TH.ls(pc.openTime)+' - '+TH.ls(pc.closeTime)+']');

            closedCandles = [];
            priceUpdates = [];

            for (var tb of this.tbuffers) {
                //console.log(' * '+tb.getSymbol()+'-'+tb.getTimeframe());
                tb.fetchHistoryCandles(this.lastPulseTime).forEach( c => {
                    closedCandles.push(c);
                    if (c.timeframe == this.pulseTF) {
                        priceUpdates.push(c);
                    }
                    count++;
                });
            }

            priceUpdates.forEach( puCandle =>
                 this.livePriceUpdate(puCandle,this.lastPulseTime) );

            this.candleProcessor.processPhaseStart(this.lastPulseTime);

            closedCandles.forEach( c => {
                this.candleProcessor.processCandle(c);
                this.lastPriceUpdateReset(c);
            });

            this.candleProcessor.processPhaseEnd();

            if (count >= CandleSequencer.SPLIT_CANDLES) {
                return false;
            }

            pc = this.pulseBuffer.peekHistoryCandle();
        }
        return true;
    }

    // todo: split history process, using setImmediate block 
    async processHistory()
    {
        if (this.tbuffers.length <= 0) {
            console.log('CSEQ: no history to process'); 
            return;
        }

        this.pulseBuffer = this.getHistoryPulseBuffer();
        let done = false;

        while (!done) {
            done = await setImmediate(this.processHistoryPart());
        }
 
    }


    loadHistory(timeStart,timeEnd) {
        let loadResults = [];
        for (var tbuf of this.tbuffers) {
            loadResults.push( setImmediate(tbuf.loadPeriod(timeStart,timeEnd)) );
        }
        return Promise.all(loadResults);
    }

    getSymbols() {
        return this.symbols;
    }

    removeSymbol(symbol) {
        console.log('CSEQ: removing symbol '+symbol);

        if (this.modeLive) { // unsubscribe from live candle stream
            const brokerCandles = this.candleProxy.getBroker();
            for (var tf of this.timeframes) {
                brokerCandles.unsubscribe(symbol,tf,this.pulser);
            }
        }

        this.symbols = this.symbols.filter( s => s !== symbol );
        this.tbuffers = this.tbuffers.filter( tb => tb.getSymbol() !== symbol );
    }


    livePriceUpdate(unclosedCandle,eventTime) {
        const priceDiff = this.lastPriceUpdateGetDiffs(unclosedCandle);
        if (! priceDiff ) { return; }
            
        this.candleProcessor.priceUpdate(
            unclosedCandle.symbol,
            unclosedCandle.openTime,
            eventTime,
            priceDiff.low,
            priceDiff.high,
            priceDiff.cur
        );
    }

    livePulse(closeTime, arrived)
    {
        console.log('CSEQ: live pulse release '+TH.ls(closeTime));

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