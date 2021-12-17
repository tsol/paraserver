/*
** SymbolProcessor holds all Tickers for specific symbol. 
** Its main job is to get data from broker, sort it by closeTime and feed
** all tickers 
*/

const TickerProcessor = require('./TickerProcessor.js');

class SymbolProcessor {

    static Timeframes = [
            { name: '1d', limit:  300 },
            { name: '1h', limit:  500 },
            { name: '15m', limit: 700 },
            { name: '1m', limit:  1000 }
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


    areAllTimeframesLoaded() {
        
        for( var tf of SymbolProcessor.Timeframes ) {
            if (! this.loadState[tf.name].bulkLoaded )
                { return false; }
        };
        
        return true;
    }

    processByTicker(candle)
    {
        /*
        let od = new Date(candle.openTime);
        let cd = new Date(candle.closeTime);

        let odt = od.toLocaleDateString('ru-RU')+' '+od.toLocaleTimeString('ru-RU');
        let cdt = cd.toLocaleDateString('ru-RU')+' '+cd.toLocaleTimeString('ru-RU');
        
        console.log('PROCESS_CANDLE: '+odt+' -> '+cdt+' === '+candle.getId());
        */
        const ticker = this.tickers[ candle.timeframe ];

        if (! ticker ) {
            throw new Error('no ticker object!');
        }

        if (!candle.closed) {
            ticker.peekCandle(candle);
            return;
        }

        ticker.addCandle(candle);
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

        console.log('SP: done loading candles, now we live on '+this.symbol);

    }

    createTickers()
    {
        for ( var tf of SymbolProcessor.Timeframes ) {
            let ticker = new TickerProcessor(this.symbol,tf.name,tf.limit,this.flags);
            this.tickers[tf.name] = ticker;
            console.log('SP: adding ticker: '+ticker.getId());
        };
    }


/* broker IO */

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
            .then( candles => {

                for(var candle of candles) {
                    this.candlesBuffer.push(candle);
                }

                state.bulkLoaded = true;

                if (this.areAllTimeframesLoaded()) {
                    this.processCandlesBuffer();
                    this.allLoaded = true;
                }

            })

    }

}

/* public IO */

    getTickerChart(timeframe) {
        return this.tickers[ timeframe ].getChart();
    }

    getTickersState() {
        return Object.keys(this.tickers).map( t => this.tickers[t].getState() );
    }
    
    getCurrentPrice() {
        const t = this.tickers[ '1m' ];
        if (! t) {
            console.error('cannot get current price of '+this.symbol);
            return 0;
        }        
        return t.getCurrentPrice();
    }

}

module.exports = SymbolProcessor;
