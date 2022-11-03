/*
** Sequencer retreives candles from candleProxy, waits for all symbols/timeframes
** to arrive, then runs them agains candleProcessor in orderly fashion:
**
** 1. Higher timeframes candles processed first.
** 2. Symbols processed according to their position in symbols array
** (usually Bitcoin is first in array so altcoin analyzers can use its current state)
**

candleProcessor must implement:

    processUpdate(...params)            - between phases live price update
    processPhaseStart(candleCloseTime)  - prepare for bunch of closed candles 
    processCandle(closedCandle)         - closed candle  
    processPhaseEnd(candleCloseTime)    - phase ended - go ahead make orders

TODO:
    6. align days with UTC time
    * 9. pass delay between pulse gather start and end to candleProcessor
    so orderManager can exclude entering deals

*/

const TickerBuffer = require('./TickerBuffer.js');

const TH = require('../../helpers/time.js');
const LivePulser = require('./LivePulser');
const { TF } = require('../../types/Timeframes.js');


const { setImmediate, setTimeout } = require('node:timers/promises')

class CandleSequencer {

    static SPLIT_PROCESS_CANDLES = 100;
    static SPLIT_LOAD_PART_SIZE = 5*24*60*60*1000; // 1*24*60*60*1000 = day


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

    getLoadPartSize() {

        // todo: make SPLIT_LOAD_SIZE dynamic depending on mimimal timeframe
        // and symbols ( 87 symbols + 1m ~= 3 days )

        return CandleSequencer.SPLIT_LOAD_PART_SIZE;
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

        await this.loadAndProcessHistory(timeStart,timeEnd);

        this.candleProcessor.loadedHistoryEnd(this.lastPulseTime);

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


    async processHistoryBuffersPart()
    {
        console.log('CSEQ: process history part... ');

        let pc = this.pulseBuffer.peekCandle(); // pulse candle
        let count = 0;

        let closedCandles = [];
        let priceUpdates = [];

        while (pc) {
            this.lastPulseTime = pc.closeTime;

            //console.log('CSEQ: pulse ['+TH.ls(pc.openTime)+' - '+TH.ls(pc.closeTime)+']');

            closedCandles = [];
            priceUpdates = [];

            for (var tb of this.tbuffers) {
                //console.log(' * '+tb.getSymbol()+'-'+tb.getTimeframe());
                tb.fetchCandles(this.lastPulseTime).forEach( c => {
                    closedCandles.push(c);
                    if (c.timeframe == this.pulseTF) {
                        priceUpdates.push(c);
                    }
                    count++;
                });
            }

            priceUpdates.forEach( puCandle =>
                 this.livePriceUpdate(puCandle,this.lastPulseTime) );

            this.candleProcessor.processPhaseStart(this.lastPulseTime,1);

            closedCandles.forEach( c => {
                this.candleProcessor.processCandle(c);
                this.lastPriceUpdateReset(c);
            });

            this.candleProcessor.processPhaseEnd(this.lastPulseTime);

            if (count >= CandleSequencer.SPLIT_PROCESS_CANDLES) {
                this.candleProcessor.loadedHistoryBlock(this.lastPulseTime);
                return false;
            }

            pc = this.pulseBuffer.peekCandle();
        }
        return true;
    }


    async processHistoryBuffers()
    {
        if (this.tbuffers.length <= 0) {
            console.log('CSEQ: no history to process'); 
            return;
        }

        this.pulseBuffer = this.getHistoryPulseBuffer();
        let done = false;

        while (!done) {
            done = await setImmediate(this.processHistoryBuffersPart());
        }
 
    }


    async loadAndProcessHistory(timeStart,timeEnd) {

        let currentStart = null;
        let currentEnd = timeStart-1;
        const maxParts = Math.ceil( (timeEnd-timeStart) / this.getLoadPartSize() );
        let currentPart = 1;

        console.log('CSEQ: load/process history: ['+TH.ls(timeStart)+'/'+TH.ls(timeEnd)+']');

        while (currentEnd < timeEnd) {
        
            currentStart = currentEnd+1;
            currentEnd = currentStart + this.getLoadPartSize()-1;
            if (currentEnd > timeEnd) { currentEnd = timeEnd; }

            if (currentStart >= currentEnd) { break; }

            console.log('CSEQ: load/process history part '+currentPart+'/'+maxParts+' ['+
                TH.ls(currentStart) + '-' + TH.ls(currentEnd)+']');

            let historyLoadStats = await setImmediate(
                this.loadHistoryPeriod(currentStart,currentEnd)
            );
        
            // cleanup failed to load symbols:
            let symbolsToRemove = {};
            historyLoadStats.filter( s => !s.res ).forEach( s => symbolsToRemove[s.symbol]=1 );
            Object.keys(symbolsToRemove).forEach( sr => this.removeSymbol(sr));

            await setImmediate(this.processHistoryBuffers());
            currentPart++;

            this.candleProcessor.loadedHistoryPart(this.lastPulseTime);
        }

        this.tbuffers = [];
    }


    loadHistoryPeriod(timeStart,timeEnd) {
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
            eventTime,
            priceDiff.low,
            priceDiff.high,
            priceDiff.cur
        );
    }

    livePulse(closeTime, arrived, passedTime)
    {
        console.log('CSEQ: live pulse release '+TH.ls(closeTime));

        if (closeTime <= this.lastPulseTime) {
            console.log('CSEQ: skipping pulse '+TH.ls(closeTime));
            return;
        }

        this.lastPulseTime = closeTime;
        this.candleProcessor.processPhaseStart(this.lastPulseTime, passedTime);

        // question: why not just arrived.forEach ???
        // answer: because order of symbols and timeframes is crutial
        // thats the reason behind whole 'phases and pulses' idea
        
        for(var s of this.symbols) {
            for (var t of this.timeframes) {
                const candle = arrived[s+'-'+t];
                if (candle) {
                    this.candleProcessor.processCandle(candle)
                }
            }
        }
        
        // todo: if we have several VMs ?
        this.candleProxy.storeNewCandles( Object.values(arrived) );

        this.candleProcessor.processPhaseEnd(this.lastPulseTime);

    }

}


module.exports = CandleSequencer