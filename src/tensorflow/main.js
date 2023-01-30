const { load } = require('./data.js');
const Model = require('./model');
const TH = require('../helpers/time');
const CandleReadCache = require('./CandleReadCache');
const tf = require('@tensorflow/tfjs');

const candleReadCache = new CandleReadCache({ limit: Infinity });

const filterMinProfit = 0.0;
const testSplit = 0.3;

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

  const model = new Model({ esMonitor: null });

  if (!model.verifyData(orders)) {
    throw new Exception('Data verification failed!');
  }

  console.log('After Verify tensors', tf.memory().numTensors);

  const trainOrders = orders.slice(
    0,
    Math.floor(orders.length * (1 - testSplit))
  );

  const testOrders = orders.slice(
    Math.floor(orders.length * (1 - testSplit)),
    orders.length
  );

  console.time('Training');

  const trainRes = await model.createAndTrainModel(trainOrders);

  console.timeEnd('Training');

  console.log('After createAndTrain tensors', tf.memory().numTensors);

  console.log(
    'Loaded orders =',
    orders.length,
    ' candles =',
    data.candles.length
  );

  const testRes = model.testModel(testOrders);

  tf.disposeVariables();
  tf.dispose(model.model);

  setTimeout(
    () => console.log('After testModel tensors', tf.memory().numTensors),
    3000
  );
})();
