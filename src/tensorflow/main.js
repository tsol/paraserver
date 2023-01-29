const { load } = require('./data.js');
const Model = require('./model');
const TH = require('../helpers/time');

(async () => {
  const data = await load({
    vmid: 1,
    symbol: 'BTCUSDT',
    timeframe: '5m',
    timeFrom: TH.timestampDaysBack(365),
    timeTo: TH.currentTimestamp(),
    strategy: 'volrev',
    //type: 'buy',
  });

  // for (let i = 0; i < 4; i++) {
  //   console.log(data.orders[i * 3]);
  // }

  const model = new Model();
  const t = model.createOneInputTensor(data.orders[0], data.candles);

  console.log('Tensor shape: ', t.shape);

  console.time();
  await model.createAndTrainModel(t.size, data.orders, data.candles);
  console.log('Done!');
  console.timeEnd();

  console.log(
    'Loaded data: orders=',
    data.orders.length,
    ' candles=',
    data.candles.length
  );

  //await model.saveModel('./model');
})();
