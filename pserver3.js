const SETTINGS = require('./private/private.js');
const BinanceUSDMCandles = require('./src/brokers/binance/BinanceUSDMCandles.js');
const BinanceUSDMUser = require('./src/brokers/binance/BinanceUSDMUser.js');
const MysqlCandles = require('./src/db/MysqlCandles.js');
const CandleProxy = require('./src/db/CandleProxy.js');

const Clients = require('./src/clients/Clients.js');
const VM = require('./src/vm/VM.js');
const ClientIO = require('./src/vm/ClientIO.js');

const TH = require('./src/helpers/time');

const AnalyzersFactory = require('./src/vm/Analyzers/AnalyzersFactory.js');


/* move to vm */

const brokerCandles = new BinanceUSDMCandles(SETTINGS.users.harry.brokers.binance);
const brokerUser = new BinanceUSDMUser(SETTINGS.users.utah.brokers.binance);
const mysqlCandles = new MysqlCandles();
const analyzersFactory = new AnalyzersFactory();


mysqlCandles.connect( SETTINGS.databases.mysqlCandles ).then( () => {
    brokerCandles.init().then( () => {
        brokerUser.init().then( () => {

            const candleProxy = new CandleProxy(mysqlCandles, brokerCandles);
       
            const clients = new Clients();
            const vm = new VM(null,candleProxy,brokerUser,clients,analyzersFactory);

            clients.start( new ClientIO(vm) );

            // ['BTCUSDT','ETHUSDT','ANCUSDT','LUNAUSDT','WAVESUSDT','ARUSDT','ATOMUSDT','UNIUSDT','FILUSDT','AVAXUSDT','SOLUSDT','SRMUSDT', 'ZRXUSDT'];
       
            const symbols    = ['BTCUSDT'];
            const timeframes = ['1m'];
            const strategies = ['cma3buy'];
            const fromTime   = TH.timestampDaysBack(3);
            const toTime     = null;

            vm.init(symbols,timeframes,strategies,fromTime,toTime,{})
                .then( () => { console.log('VM initialized'); });
        
        })
    })
});

