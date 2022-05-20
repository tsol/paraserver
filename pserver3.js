const SETTINGS = require('./private/private.js');
const BinanceUSDMCandles = require('./src/brokers/binance/BinanceUSDMCandles.js');
const BinanceUSDMUser = require('./src/brokers/binance/BinanceUSDMUser.js');
const MysqlCandles = require('./src/db/MysqlCandles.js');
const CandleProxy = require('./src/db/CandleProxy.js');

const CandleProcessor = require('./src/vm/CandleProcessor');
const CandleSequencer = require('./src/vm/CandleSequencer');

const TH = require('./src/helpers/time');

const brokerCandles = new BinanceUSDMCandles(SETTINGS.users.harry.brokers.binance);
const brokerUser = new BinanceUSDMUser(SETTINGS.users.utah.brokers.binance);
const mysqlCandles = new MysqlCandles();

mysqlCandles.connect( SETTINGS.databases.mysqlCandles ).then( () => {
    brokerCandles.init().then( () => {
        brokerUser.init().then( () => {

            const candleProxy = new CandleProxy(mysqlCandles, brokerCandles);
            const candleProcessor = new CandleProcessor();
            // 'BTCUSDT','ETHUSDT','ANCUSDT','LUNAUSDT','WAVESUSDT','ARUSDT','ATOMUSDT','UNIUSDT','FILUSDT','AVAXUSDT','SOLUSDT','SRMUSDT', 'ZRXUSDT'
            
            const candleSequencer = new CandleSequencer([
                'BTCUSDT'
                ],['15m'],
                candleProxy,candleProcessor);

            candleSequencer.init(
                TH.timestampDaysBack(3),
                null
            ).then( () => { console.log('Sequencer initialized'); });
/*
            const candleSequencer2 = new CandleSequencer([
                'BTCUSDT','ETHUSDT','ANCUSDT','LUNAUSDT','WAVESUSDT','ARUSDT','ATOMUSDT','UNIUSDT','FILUSDT','AVAXUSDT','SOLUSDT','SRMUSDT', 'ZRXUSDT'
                ],['3m','15m'],
                candleProxy,candleProcessor);

            candleSequencer2.init(
                TH.timestampDaysBack(1),
                null
            ).then( () => { console.log('Sequencer 2 initialized'); });
*/
        })
    })
});

