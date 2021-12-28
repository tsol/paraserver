const BinanceSource = require('./src/brokers/binance/BinanceSource.js');
const USERS = require('./private/private.js');
const brokerSrc = new BinanceSource(USERS.users.harry.brokers.binance);
const { TF } = require('./src/types/Timeframes.js');

function displayCandle(msg, candle) {
    console.log(msg+' FROM: '
        +TF.timestampToDate(candle.openTime)+' to '
        +TF.timestampToDate(candle.closeTime)
    );
    console.log(candle);
}

brokerSrc.loadCandlesPeriod(
    'BTCUSDT','1m',
    TF.dateToTimestamp('2021-12-27 00:00:00'),
    TF.currentTimestamp()
).then( (candles) => {

    console.log('COUNT CANDLES: '+candles.length);
    
    let lastCandle = candles[ candles.length - 1]; 
    let firstCandle = candles[0];

    displayCandle('FIRST: ',firstCandle);
    displayCandle('LAST: ',lastCandle);
    

})

console.log("hello there!");



