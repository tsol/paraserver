const SETTINGS = require('./private/private.js');

const DataProcessor = require('./src/processors/DataProcessor.js');
const OrdersManager = require('./src/processors/orders/OrdersManager.js');

const BinanceSourceUSDM = require('./src/brokers/binance/BinanceSourceUSDM.js');
const BinanceClientUSDM = require('./src/brokers/binance/BinanceClientUSDM.js');

const MysqlCandles = require('./src/db/MysqlCandles.js');
const CandleDB = require('./src/db/CandleDB.js');
const Clients = require('./src/clients/Clients.js');

const brokerSrc = new BinanceSourceUSDM(SETTINGS.users.harry.brokers.binance);
const brokerClientUSDM = new BinanceClientUSDM(SETTINGS.users.utah.brokers.binance);

const mysqlCandles = new MysqlCandles();

let dataProcessor = null;
let ordersManager = null;
let candleDB = null;
let clients = null;


const runLive = ( typeof(SETTINGS.runLive) != "undefined" ? SETTINGS.runLive : true );

mysqlCandles.connect( SETTINGS.databases.mysqlCandles ).then( () => {
    brokerClientUSDM.init().then( () => {

        clients = new Clients();
        candleDB = new CandleDB(mysqlCandles, brokerSrc);
        ordersManager = new OrdersManager(brokerClientUSDM, clients);
        dataProcessor = new DataProcessor(null,brokerSrc,brokerClientUSDM,candleDB,ordersManager);
        
        clients.start(dataProcessor);

        if (!SETTINGS.dev) {

            brokerSrc.getTradableSymbols().then( (symbols) => {
                symbols.forEach( s => dataProcessor.runSymbols([s], runLive) );
                //dataProcessor.runSymbols(symbols, runLive);
            });
    
        }
        else {

            brokerSrc.getTradableSymbols().then( (symbols) => { 
                let coins = ( typeof(SETTINGS.debugSymbols) != "undefined" ? SETTINGS.debugSymbols : symbols );                
                //coins.forEach( s => dataProcessor.runSymbols([s], runLive) );
                
                coins = coins.filter( c => c !== 'BTCUSDT' ); coins.unshift('BTCUSDT');
                dataProcessor.runSymbols(coins, runLive);
            });
        }

    })
});






