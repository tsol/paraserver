const SETTINGS = require('./private/private.js');
//const { USDMClient } = require('binance');

const BrokerOrder = require('./src/types/BrokerOrder.js');
const Broker = require('./src/brokers/binance/BinanceClientUSDM.js');

const broker = new Broker(SETTINGS.users.utah.brokers.binance);

//const client = broker.getClient();
//setAllIsolated(broker);

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

