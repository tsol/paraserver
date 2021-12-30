
const SymbolsLoader = require('./SymbolsLoader.js');
const Flags = require('./Flags.js');

class DataProcessor {

    constructor(ordersManager, candlesDB) {
        this.flags = new Flags();
        this.loaders = [];
        this.tickers = {};
        this.ordersManager = ordersManager;
        this.candlesDB = candlesDB;
    }
 
    /*
     Ex: dp->runSymbols([
            { symbol: 'SOLUSDT', broker: binance },
            { symbol: 'BTCUSDT', broker: binance }
        ]);
    */

    runSymbols(symbolBrokerArray)
    {
        const loader = new SymbolsLoader(symbolBrokerArray, 
            this, this.ordersManager, this.candlesDB);   
        this.loaders.push(loader);
    }

 // todo: change this to promise by symbol loader and wait with .then
 // and probably we don't need loaders[] array, since no API asks if something is loading
 // and then again we should prevent attempts to start loading symbol if it's in progress...
 // think about it
    loaderFinished(loader) {
 
        this.flags.merge( loader.getFlags() );

        for (var ticker of loader.getTickers()) {
            ticker.setFlagsObject(this.flags);
            ticker.setLive();
            this.tickers[ ticker.getId() ] = ticker;
        }
 
        this.loaders = this.loaders.filter( l => l !== loader);
    }

    getTickerChart(symbol, timeframe) {
        const ticker = this.tickers[ symbol+'-'+timeframe ];
        if (! ticker ) {
            console.log('DP: ticker not loaded yet!');
            return null;
        }
        return ticker.getChart();
    }

    getTickersState() {
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
}

module.exports = DataProcessor;
