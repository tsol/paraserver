
const TickerProcessor = require('./TickerProcessor.js');
const Flags = require('./Flags.js');

class SymbolProcessor {

    static Timeframes = [
            { name: '1d', limit: 10 },
            { name: '1h', limit: 50 },
            { name: '15m', limit: 100 },
            { name: '1m', limit: 150 }
    ];

    constructor(brokerSource, symbol, flagsObject) {
        this.broker = brokerSource;
        this.symbol = symbol;
        this.flags = flagsObject;
        
        this.candlesBuffer = [];
        this.loadState = {};
        this.allLoaded = false; 

        this.tickers = {};

        SymbolProcessor.Timeframes.forEach( (tf) => {
            this.loadState[ tf.name ] = {
                wasLive: false,
                bulkLoaded: false,
                limit: tf.limit
            };
            this.broker.subscribe(symbol,tf.name,this);
        });

    }

    newCandleFromBroker(candle) {

        if (this.allLoaded) {
            // todo: process through ticker
            this.processByTicker(candle);
            return;
        }

        const state = this.loadState[ candle.timeframe ];

        this.candlesBuffer.push(candle);

        // we load history data only after first candle received by live stream
        if (! state.wasLive) {
            state.wasLive = true;

            this.broker.loadCandles(this.symbol, candle.timeframe, state.limit)
                .then( (candles) => {
                    for(var candle of candles) {
                        this.candlesBuffer.push(candle);
                    }

                    state.bulkLoaded = true;

                    if (this.areAllTimeframesLoaded()) {
                        this.processCandlesssBuffer();
                        this.allLoaded = true;
                    }

                })

        }

    }

    areAllTimeframesLoaded() {
        
        for ( tf of SymbolProcessor.Timeframes ) {
            if (! this.loadState[tf].bulkLoaded )
                { return false; }
        };
        
        return true;
    }

    processByTicker(candle)
    {
        let time = (new Date(candle.openTime).toLocaleTimeString('ru-RU'));
        console.log('PROCESS_CANDLE: '+time+' '+candle.getId());

        // todo: get ticker and process by it

    }

    processCandlesBuffer() {

        const candles = [];
        const uniqueId = {};

        console.log('SP: filtering candle buffer...');

        /* filtering out duplicates from livestream and bulk history */
        let cnt = 0;
        this.candlesBuffer.forEach( (candle) => {
            if (uniqueId[ candle.getId() ]) {
                console.log('SP: double candle filtered out: '+candle.getId())
                return;
            }
            candle.count = cnt;
            cnt++;
            candles.push(candle);
            uniqueId[ candle.getId() ] = 1;
        });

        console.log('SP: resorting by close time...');

        /* re-sort by open time */
        candles.sort((a, b) => (a.closeTime > b.closeTime) ? 1 : -1)

        console.log('SP: creating tickers for '+this.symbol);
        this.createTickers();

        console.log('SP: processing all loaded candles...');

        candles.forEach( candle => this.processByTicker(candle) );

    }

    createTickers()
    {
        for ( tf of SymbolProcessor.Timeframes ) {
            let ticker = new TickerProcessor(this.symbol,tf.name,tf.limit,this.flags);
            const tickerId = ticker.getId();
            this.tickers[tickerId] = ticker;
            console.log('SP: adding ticker: '+tickerId);
        };
    }

/*
    getChart(tickerId) {
        return this.tickers[tickerId].getChart();
    }

    getState() {
        return Object.keys(this.tickers).map( t => this.tickers[t].getState() );
    }
    
    getCurrentPrice(symbol) {
        const t = this.tickers[ symbol+'-1m' ];
        if (! t) {
            console.error('cannot get current price of '+symbol);
            return 0;
        }
            
        return t.getCurrentPrice();
    }

*/

}

module.exports = SymbolProcessor;
