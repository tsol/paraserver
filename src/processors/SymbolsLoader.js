/*
** Takes up array of symbols and brokers, loads up history
** creates tickers and flag object, create tickers runs
** all them and returns all tickers and flags to dataProcessor
** to merge to the list.
** 
*/

const TickerProcessor = require('./TickerProcessor.js');
const Flags = require('./Flags.js');
const { TF } = require('../types/Timeframes.js');

class SymbolsLoader {

    constructor(symbols, dataProcessor, ordersManager, candleDB, analyzersFactory) {
        this.id = 'loader'+Math.random();

        this.candleDB = candleDB;
        this.dataProcessor = dataProcessor;
        this.ordersManager = ordersManager;
        this.analyzersFactory = analyzersFactory;

        this.flags = new Flags();
        
        this.candlesBuffer = [];
        this.loadState = [];
   
        this.tickers = {};
        this.load(symbols);
    }

    getId() {
        return this.id;
    }

/*    [ { symbol: 'SOLUSDT', broker: binance },
        { symbol: 'BTCUSDT', broker: binance } ]
*/

    async load(symbols) {
        symbols.forEach( (s) => {
            TF.TFRAMES.forEach( (tf) => {                
                const ls = {
                    symbol: s.symbol,
                    broker: s.broker,
                    timeframe: tf.name,
                    limit: tf.limit,
                    days: tf.days,
                    wasLive: false,
                    bulkLoaded: false
                };
                ls.broker.subscribe(ls.symbol, ls.timeframe, this.id, this );
                this.loadState.push(ls);
            });
        });

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

            this.candleDB.getClosedCandlesSince(
                state.symbol, state.timeframe, TF.timestampDaysBack( state.days ) )
                .then( candles => {
    
                    for(var candle of candles) {
                        this.candlesBuffer.push(candle);
                    }
    
                    state.bulkLoaded = true;
    
                    if (this.isAllLoaded()) {
                        this.processCandlesBuffer();
                        this.finish();
                    }
    
                })
    
        }
    
    }
    
    finish()
    {
        for (var ls of this.loadState) {
            console.log('SL: unsubscribing loader '+this.getId()+' from '+ls.symbol+'-'+ls.timeframe);
            ls.broker.unsubscribe(ls.symbol,ls.timeframe,this.getId());
        }

        this.candlesBuffer = [];
        this.loadState = [];

        this.dataProcessor.loaderFinished( this );
        console.log('SL: loading finished, passed tickers to dataProcessor ');
    }

    getFlags() { return this.flags; }
    getTickers() { return Object.values(this.tickers); }

    isAllLoaded() {
        for( var ls of this.loadState ) {
            if (! ls.bulkLoaded )
                { return false; }
        };
        return true;
    }

    processCandlesBuffer() {

        const candles = [];
        const uniqueId = {};

        console.log('SL: filtering candle buffer...');

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

        console.log('SL: resorting by close time...');

        /* re-sort by open time */
        candles.sort((a, b) => (a.closeTime > b.closeTime) ? 1 : -1)

        console.log('SL: creating tickers for '+this.getId());
        this.createTickers();

        console.log('SL: processing all loaded candles...');

        candles.forEach( candle => this.processByTicker(candle) );

        console.log('SL: done loading candles to tickers');

    }

    processByTicker(candle)
    {
        /*
        let od = new Date(candle.openTime);
        let cd = new Date(candle.closeTime);

        let odt = od.toLocaleDateString('ru-RU')+' '+od.toLocaleTimeString('ru-RU');
        let cdt = cd.toLocaleDateString('ru-RU')+' '+cd.toLocaleTimeString('ru-RU');
        
        console.log('SL: PROCESS_CANDLE: '+odt+' -> '+cdt+' === '+candle.getId());
        */
        const ticker = this.tickers[ candle.symbol+'-'+candle.timeframe ];

        if (! ticker ) {
            throw new Error('no ticker object!');
        }

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
                this.analyzersFactory.createBox()
            ); 

            this.tickers[ls.symbol+'-'+ls.timeframe] = ticker;
            ls.broker.subscribe(ls.symbol,ls.timeframe,'ticker-'+ticker.getId(),ticker);
            console.log('SL: adding ticker: '+ticker.getId());
        };
    }
}

module.exports = SymbolsLoader;
