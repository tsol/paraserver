const BinanceSource = require('./src/brokers/binance/BinanceSource.js');
const SETTINGS = require('./private/private.js');
const brokerSrc = new BinanceSource(SETTINGS.users.harry.brokers.binance);
const { TF } = require('./src/types/Timeframes.js');
const MysqlDB = require('./src/db/MysqlDB.js');
const CandleDB = require('./src/db/CandleDB.js');

const mysqlHandler = new MysqlDB();
const candleDB = new CandleDB(mysqlHandler, [ brokerSrc ]);

var d = new Date();

console.log('Today is: ' + d.toLocaleString());
d.setDate(d.getDate() - 5);
console.log('5 days ago was: ' + d.toLocaleString());

mysqlHandler.connect( SETTINGS.databases.mysql ).then( () => {
    
    //candleDB.getCandlesSince('BTCUSDT','1m', '2021-12-29 00:00:00').then( (candles) => {
    
    candleDB.getCandlesPeriod('BTCUSDT','1m', 
        TF.dateToTimestamp('2021-12-29 00:00:00'),
        TF.dateToTimestamp('2021-12-29 03:59:59')
     ).then( (candles) => {
    
        console.log('CANDLES:');
        console.log(candles);

        let lastCandle = candles[ candles.length - 1]; 
        let firstCandle = candles[0];
    
        displayCandle('FIRST: ',firstCandle);
        displayCandle('LAST: ',lastCandle);
    

        //mysqlHandler.disconnect();

    });       
});

/*
brokerSrc.loadCandlesPeriod(
    'BTCUSDT','1m',
    TF.dateToTimestamp('2021-12-27 00:00:00'),
    TF.currentTimestamp()
).then( (candles) => {
*/

/* 
candleDB.getCandlesSince('BTCUSDT','1m','2021-12-01 00:00:00')
  .then( (candles) => {

    console.log('COUNT CANDLES: '+candles.length);    
    let lastCandle = candles[ candles.length - 1]; 
    let firstCandle = candles[0];

    displayCandle('FIRST: ',firstCandle);
    displayCandle('LAST: ',lastCandle);
    

})

*/
console.log("hello there!");

function displayCandle(msg, candle) {
    console.log(msg+' FROM: '
        +TF.timestampToDate(candle.openTime)+' to '
        +TF.timestampToDate(candle.closeTime)
    );
    console.log(candle);
}



