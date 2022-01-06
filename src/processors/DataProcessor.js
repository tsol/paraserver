
const SymbolsLoader = require('./SymbolsLoader.js');
const Flags = require('./Flags.js');
const AnalyzersFactory = require('../analyzers/AnalyzersFactory.js');
const OrdersManager = require('./OrdersManager.js');


class DataProcessor {

    constructor(mysqlHandler, brokers, candleDB) {
        this.flags = new Flags();
        this.loaders = [];
        this.tickers = {};
        this.ordersManager = new OrdersManager();
        this.analyzersFactory = new AnalyzersFactory();
        this.mysqlHandler = mysqlHandler;
        this.brokers = brokers;
        this.candleDB = candleDB;
    }
 
    restartAll(runLive) {
        this.flags = new Flags();
        
        this.loaders.forEach( l => l.abort() );
        this.loaders = [];
  
        let symbolsList = this.getAllSymbols();

        // todo: unsubscribe tickers if subscribed
        for (var t of Object.values(this.tickers)) {
            t.unsubscribeFromBroker();
        }
        this.tickers = {};
  
        this.ordersManager.reset();
        this.analyzersFactory.reloadAll();
        
        this.runSymbols(symbolsList,runLive);

    }

    getAllSymbols() {
        let foundSymbols = {};
        for (var t of Object.values(this.tickers)) {
            foundSymbols[ t.symbol ] = 1;
        }
        return Object.keys(foundSymbols);
    }


    /*
     Ex: dp->runSymbols([
            { symbol: 'SOLUSDT', broker: binance },
            { symbol: 'BTCUSDT', broker: binance }
        ]);
    */

    runSymbols(symbolsArray, runLive)
    {
        const loader = new SymbolsLoader(symbolsArray, runLive, 
            this, this.ordersManager, this.candleDB, this.analyzersFactory, this.brokers);   
        this.loaders.push(loader);
    }

 // todo: change this to promise by symbol loader and wait with .then
 // and probably we don't need loaders[] array, since no API asks if something is loading
 // and then again we should prevent attempts to start loading symbol if it's in progress...
 // think about it
    loaderFinished(newTickers, newFlags, loader) {
 
        this.flags.merge( newFlags );

        for (var ticker of newTickers) {
            ticker.setFlagsObject(this.flags);
            this.tickers[ ticker.getId() ] = ticker;
        }
 
        this.loaders = this.loaders.filter( l => l !== loader);
    }

    getTickerChart({ symbol, timeframe, limit, timestamp } ) {
        const ticker = this.tickers[ symbol+'-'+timeframe ];
        if (! ticker ) {
            console.log('DP: ticker not loaded yet!');
            return null;
        }
        return ticker.getChart(limit, timestamp);
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

    getOrders() {
        return this.ordersManager.toJSON();
    }

}

module.exports = DataProcessor;
