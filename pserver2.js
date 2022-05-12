const SETTINGS = require('./private/private.js');
const DataProcessor = require('./src/processors/DataProcessor.js');
const BinanceUSDMCandles = require('./src/brokers/binance/BinanceUSDMCandles.js');
const BinanceUSDMUser = require('./src/brokers/binance/BinanceUSDMUser.js');
const MysqlCandles = require('./src/db/MysqlCandles.js');
const CandleProxy = require('./src/db/CandleProxy.js');
const Clients = require('./src/clients/Clients.js');

const brokerCandles = new BinanceUSDMCandles(SETTINGS.users.harry.brokers.binance);
const brokerUser = new BinanceUSDMUser(SETTINGS.users.utah.brokers.binance);
const mysqlCandles = new MysqlCandles();

const runLive = ( typeof(SETTINGS.runLive) != "undefined" ? SETTINGS.runLive : true );

mysqlCandles.connect( SETTINGS.databases.mysqlCandles ).then( () => {
    brokerCandles.init().then( () => {
        brokerUser.init().then( () => {

            const clients = new Clients();
            const candleProxy = new CandleProxy(mysqlCandles, brokerCandles);
            const dataProcessor = new DataProcessor(null,brokerCandles,brokerUser,candleProxy,clients);
        
            clients.start(dataProcessor);

            if (!SETTINGS.dev) {

                brokerCandles.getTradableSymbols().then( (symbols) => {
                //symbols.forEach( s => dataProcessor.runSymbols([s], runLive) );
                    dataProcessor.runSymbols(symbols, runLive);
                });
    
            }
            else {

                brokerCandles.getTradableSymbols().then( (symbols) => { 
                    let coins = ( typeof(SETTINGS.debugSymbols) != "undefined" ? SETTINGS.debugSymbols : symbols );                
                    //coins.forEach( s => dataProcessor.runSymbols([s], runLive) );
                
                    coins = coins.filter( c => c !== 'BTCUSDT' ); coins.unshift('BTCUSDT');
                    dataProcessor.runSymbols(coins, runLive);
                });
            }

        })
    })
});






