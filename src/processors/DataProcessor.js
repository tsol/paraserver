
const SymbolsLoader = require('./SymbolsLoader.js');
const Flags = require('./Flags.js');
const AnalyzersFactory = require('../analyzers/AnalyzersFactory.js');
const OrdersManager = require('./OrdersManager.js');
const { TF } = require('../types/Timeframes.js');


class DataProcessor {

    constructor(mysqlHandler, brokers, candleDB) {
        this.flags = new Flags();
        this.loaders = [];
        this.tickers = {};
        this.ordersManager = new OrdersManager();
        this.analyzersFactory = new AnalyzersFactory(this.ordersManager);
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
        
        symbolsList.forEach( s => this.runSymbols([s],runLive) );
        

    }

    getAllSymbols() {
        let foundSymbols = {};
        for (var t of Object.values(this.tickers)) {
            foundSymbols[ t.symbol ] = 1;
        }
        return Object.keys(foundSymbols);
    }


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

    getOrdersStatistics(fromTimestamp, toTimestamp) {
        return this.ordersManager.genStatistics(fromTimestamp, toTimestamp);
    }

    getTimeframes() {
        let res = [];
        TF.TFRAMES.forEach( t => { if (t.trade) { res.push(t.name); } } );
        return res.reverse();
    }


}

module.exports = DataProcessor;
