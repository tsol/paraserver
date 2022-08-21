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
       
            let symbols    = null;
            let timeframes = ['1h'];
            let strategies = [];
            let fromTime   = TH.utcDaysBack(92);
            let toTime     = null;

            if (SETTINGS.dev) {
                if (SETTINGS.debugSymbols)      { symbols = SETTINGS.debugSymbols; }
                if (SETTINGS.debugTimeframes)   { timeframes = SETTINGS.debugTimeframes; }
                if (SETTINGS.debugStrategies)   { strategies = SETTINGS.debugStrategies; }
                if (SETTINGS.debugFrom)         { fromTime = TH.dateToTimestamp(SETTINGS.debugFrom); }
                if (SETTINGS.debugTo)           { toTime = TH.dateToTimestamp(SETTINGS.debugTo); }
                
                if (SETTINGS.debugDays) { 
                    fromTime = TH.utcDaysBack(SETTINGS.debugDays);
                    toTime = (new Date()).getTime();
                }
                
            }

            brokerCandles.getTradableSymbols().then( (allSymbols) => {
               
                if (! symbols ) { symbols = allSymbols; }

                symbols = symbols.filter( c => c !== 'BTCUSDT' ); symbols.unshift('BTCUSDT');

                vm.init(symbols,timeframes,strategies,fromTime,toTime,{})
                    .then( () => { console.log('VM initialized'); });

            });


        })
    })
});

