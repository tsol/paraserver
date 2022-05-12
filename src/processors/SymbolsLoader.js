/*
** Takes up array of symbols and brokers, loads up history
** creates tickers and flag object, create tickers runs
** all them in orderly fashion and returns all tickers and flags to dataProcessor
** to merge to the list of tickers and flags already in dataProcessor.
**
** The main task of this class is to allow a group of different symbols
** to be loaded and PROCESSED together with correct time order (as a little time machine)
** so that analyzers of one symbol (say SOLUSDT) can request flags data from
** another symbol (say hl_trend on BTCUSDT)
**
*/

const TickerProcessor = require('./TickerProcessor.js');
const Flags = require('./Flags.js');
const { TF } = require('../types/Timeframes.js');

class SymbolsLoader {

    constructor(symbols, runLive, dataProcessor, ordersManager, candleProxy, analyzersFactory, broker) {
        this.id = 'loader'+Math.random();

        this.runLive = runLive;

        this.candleProxy = candleProxy;
        this.dataProcessor = dataProcessor;
        this.ordersManager = ordersManager;
        this.analyzersFactory = analyzersFactory;
        this.broker = broker;

        this.flags = new Flags();
        
        this.candlesBuffer = [];
        this.loadState = [];
   
        this.tickers = {};
        this.load(symbols);
    }

    getId() {
        return this.id;
    }

    isRunLive() {
        return this.runLive;
    }

    async load(symbols) {

        var count = 0;
        
        for (var s of symbols)
        {
            for (var tf of TF.TFRAMES)
            {                
                const ls = {
                    symbol: s,
                    broker: this.broker,
                    timeframe: tf.name,
                    limit: tf.limit,
                    days: tf.days,
                    wasLive: false,
                    bulkLoaded: false
                };

                this.loadState.push(ls);

                if (this.runLive) {
                    ls.broker.subscribe(ls.symbol, ls.timeframe, this );

                    if (++count > 4) {
                        console.log("SLEEPING for websock init");
                        await this.sleep(1100);
                        count = 0;
                    }

                }
                else {
                    this.loadHistoryCandles(ls);
                }

            };
        }

    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    abort() {
        this.unsubscribeAndFlushBuffers();
    }


    newCandleFromBroker(candle) {

        const state = this.loadState.find( 
            ls => 
                (ls.symbol === candle.symbol) 
                && (ls.timeframe == candle.timeframe )
        );

        if (! state) {
            console.log('SL: missing load state for '+candle.getId());
            return;
        }
       
        if (candle.closed) {
            this.candlesBuffer.push(candle);
        }

        // we load history data only after first candle received by live stream
        if (! state.wasLive) {
            state.wasLive = true;
            console.log('SL: first candle from broker: '+candle.getId());
            this.loadHistoryCandles(state);
        }
    
    }

    loadHistoryCandles(state) {

        this.candleProxy.getClosedCandlesSince(
            state.symbol,
            state.timeframe,
            TF.timestampDaysBack( state.days ),
            this.runLive
        )
        .then( (candles) => {

                for(var candle of candles) {
                    this.candlesBuffer.push(candle);
                }

                state.bulkLoaded = true;

                if (this.isAllLoaded()) {
                    this.processCandlesBuffer();
                    this.unsubscribeAndFlushBuffers();
                    
                    this.dataProcessor.loaderFinished( 
                        Object.values(this.tickers),
                        this.flags,
                        this
                    );

                    console.log('SL: loading finished, passed tickers to dataProcessor ');
                }

        });

    }

    unsubscribeAndFlushBuffers()
    {
        if (this.runLive) {
            for (var ls of this.loadState) {
                console.log('SL: unsubscribing loader '+this.getId()+' from '+ls.symbol+'-'+ls.timeframe);
                ls.broker.unsubscribe(ls.symbol,ls.timeframe,this);
            }
        }

        this.candlesBuffer = [];
        this.loadState = [];

    }

    isAllLoaded() {
        var res = true;

        for( var ls of this.loadState ) {
            if (! ls.bulkLoaded ) {
                ///console.log('SL: NOT YET LOADED: '+ls.symbol+' - '+ls.timeframe);
                res = false;
                return res;
            }
        };
        return res;
    }

    processCandlesBuffer() {

        let candles = [];
    
        if (this.runLive) {
            console.log('SL: filtering candle buffer...');
            const uniqueId = {};

            /* filtering out duplicates from livestream and bulk history */
            let cnt = 0;
            this.candlesBuffer.forEach( (candle) => {
                if (uniqueId[ candle.getId() ]) {
                    console.log('SL: double candle filtered out: '+candle.getId())
                    return;
                }
                candle.count = cnt;
                cnt++;
                candles.push(candle);
                uniqueId[ candle.getId() ] = 1;
            });
        }
        else {
            candles = this.candlesBuffer;
        }

        console.log('SL: resorting by close time...');

        /* re-sort by open time */
        candles.sort((a, b) => (a.closeTime > b.closeTime) ? 1 : -1)

        console.log('SL: creating tickers for '+this.getId());
        this.createTickers();

        console.log('SL: processing all loaded candles...');
        let countAll = 0;
        let countBreak = 0;

        candles.forEach( (candle) => {
            
            this.processByTicker(candle);
            countAll++;

            if (++countBreak > 100000) {
                countBreak = 0;
                console.log("SL: processed "+countAll+" of "+candles.length+" candles, date: "+
                    TF.timestampToDate(candle.openTime) );
            }
            
        });

        if (this.runLive) { 
            console.log('SL: subscribing all tickers to broker live candles...');
            for (var t of Object.values(this.tickers)) {
                t.subscribeToBroker();
            }
    
        }

        console.log('SL: done creating tickers');

    }

    processByTicker(candle)
    {
        const key = candle.symbol+'-'+candle.timeframe;
        const ticker = this.tickers[ key ];
        if (! ticker )
            { throw new Error('no ticker object!'); }
        ticker.addCandle(candle);
    }

    createTickers()
    {
        for ( var ls of this.loadState ) {

            let ticker = new TickerProcessor(
                ls.symbol,
                ls.timeframe,
                ls.limit,
                this.flags,
                this.ordersManager,
                this.analyzersFactory.createBox(),
                ls.broker
            ); 

            this.tickers[ls.symbol+'-'+ls.timeframe] = ticker;
            console.log('SL: adding ticker: '+ticker.getId());
        };
    }
}

/*

TODO: split process of processing candles and invoke
this every N loops to avoid event-loop and network congestion

function setImmediatePromise() {
    return new Promise((resolve) => {
      setImmediate(() => resolve());
    });
}

*/

module.exports = SymbolsLoader;
