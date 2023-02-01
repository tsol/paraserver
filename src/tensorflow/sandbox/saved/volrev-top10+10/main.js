const { load } = require('./data.js');
const Model = require('./model');
const TH = require('../helpers/time');
const CandleReadCache = require('./CandleReadCache');

const candleReadCache = new CandleReadCache({ limit: Infinity });

const filterMinProfit = 0.0;
const testSplit = 0.2;

(async () => {
  const data = await load({
    vmid: 3,
    //symbol: 'ETHUSDT',
    timeframe: '5m',
    timeFrom: TH.timestampDaysBack(365 * 2),
    timeTo: TH.currentTimestamp(),
    strategy: 'volrev',
    //type: 'buy',
  });

  const orders = data.orders.filter(
    (o) => o.tags.MAXPRF.value >= filterMinProfit
  );
  data.candles.forEach((c) => candleReadCache.addCandle(c));

  const model = new Model(candleReadCache);

  const t = model.createOneInputTensor(orders[0]);
  const o = model.createOneLabelTensor(orders[0]);

  //console.log('Order:', orders[0]);
  console.log('Tensor shape: ', t.shape);
  //console.log('Label:', o.dataSync());

  const trainOrders = orders.slice(
    0,
    Math.floor(orders.length * (1 - testSplit))
  );

  console.time();
  await model.createAndTrainModel(t.size, trainOrders);
  console.log('Done!');
  console.timeEnd();

  console.log(
    'Loaded data: orders =',
    orders.length,
    ' candles =',
    data.candles.length
  );

  const testOrders = orders.slice(
    Math.floor(orders.length * (1 - testSplit)),
    orders.length
  );

  await model.testModel(testOrders);

  // const testData = await load({
  //   vmid: 2,
  //   symbol: 'BTCUSDT',
  //   timeframe: '5m',
  //   timeFrom: TH.timestampDaysBack(365 * 2),
  //   timeTo: TH.currentTimestamp(),
  //   strategy: 'volrev',
  // });

  // await model.testModel(testData.orders);
})();
