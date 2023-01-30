import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { load } = require('./data.js');
const TH = require('../helpers/time');
const CandleReadCache = require('./CandleReadCache');
// const trainNewModel = require('./trainee');
const { dataSplit } = require('./helpers');

import optimize from './optimizer.mjs';
import * as hpjs from 'hyperparameters';

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

  const [trainOrders, testOrders] = dataSplit(orders, testSplit);

  console.log('Orders:', orders.length, 'Candles:', data.candles.length);

  // trainNewModel({}, trainOrders, testOrders);

  const space = {
    //optimizer: hpjs.choice(['sgd', 'adam', 'adagrad', 'rmsprop']),
    epochsMin: hpjs.quniform(5, 50, 3),
    batchSize: hpjs.quniform(16, 128, 8),
  };

  //const opt = await optimize('loss', space, 10, trainOrders, testOrders);
  const opt = await optimize(
    'topStats.ratio',
    space,
    50,
    trainOrders,
    testOrders
  );

  console.log('Max:', opt.argmax);
  console.log('Min:', opt.argmin);
})();
