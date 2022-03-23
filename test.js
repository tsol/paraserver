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
/*
    broker.closeOrderIds('ATOMUSDT', [11002507004, 11002507005])
        .then( (res) => {
            console.log('res');
            console.log(res);
        })
        .catch( (err) => {
            console.log('err');
            console.log(err);
        });
*/

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
client.submitNewOrder({
    symbol: 'ATOMUSDT',
    side: 'BUY',
//    positionSide: 'LONG',
    type: 'MARKET',
    quantity: 1,
}).then(result => {
    console.log("newOrder: ", result);
]
  })
  .catch(err => {
    console.error("newOrder error: ", err);
});

console.log("DONE!");
*/


/*
client.get24hrChangeStatististics()
  .then(result => {
    console.log("get24hrChangeStatististics inverse futures result: ", result);
  })
  .catch(err => {
    console.error("get24hrChangeStatististics inverse futures error: ", err);
  });
*/
