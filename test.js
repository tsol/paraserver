const SETTINGS = require('./private/private.js');
//const { USDMClient } = require('binance');

const BrokerOrder = require('./src/types/BrokerOrder.js');
const Broker = require('./src/brokers/binance/BinanceClientUSDM.js');

const broker = new Broker(SETTINGS.users.utah.brokers.binance);

const entryPrice = 27.89;
const takePrice = entryPrice*1.1;
const stopPrice = entryPrice*0.9;

broker.init().then( () => {
    let info = broker.getSymbolInfo('ATOMUSDT');
    console.log("INFO:");
    console.log(info);

    broker.makeFullOrder('ATOMUSDT',true,entryPrice,30,stopPrice,takePrice)
    .then( (result)  => {
        console.log('main_loop:');
        console.log(result);
    }).catch( (err) => {
        console.log('main_loop_error:');
        console.log(err);
    })

});


/*
client.get24hrChangeStatististics()
  .then(result => {
    console.log("get24hrChangeStatististics inverse futures result: ", result);
  })
  .catch(err => {
    console.error("get24hrChangeStatististics inverse futures error: ", err);
  });
*/
