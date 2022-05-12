const STDDEV = require('./src/analyzers/helpers/STDDEV.js');

const d = new STDDEV(4);

for (var i of [10,20,30,40]) {
  console.log(d.getSTDDEV(i));
}



/*

const SETTINGS = require('./private/private.js');

const BrokerOrder = require('./src/types/BrokerOrder.js');
const Broker = require('./src/brokers/binance/BinanceUSDMUser.js');
const { appendEventIfMissing } = require('binance');

const broker = new Broker(SETTINGS.users.utah.brokers.binance);

broker.periodicCleanup().then( () => {
  console.log('CLEANUP FINISHED OK');
  process.exit();
});

function createTestOrder(broker)
{

const symbol='BTCUSDT';
const entryPrice = 44350;
const isLong = true;
const takeProfit = entryPrice+70;
const stopLoss = entryPrice-70;
const usdAmount = 30;

broker.makeFullOrder(symbol,isLong,entryPrice,usdAmount,stopLoss,takeProfit)
  .then( (res) => {
    console.log('ORDER MADE!');
    console.log(res);
  })
  .catch( (err)  => {
    console.log('ORDER ERROR!');
    console.log(err.message);
  });
}

*/