import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { dataConnect, loadOrders } = require('./data.js');

import optimize from './optimizer.mjs';
import * as hpjs from 'hyperparameters';

const pCommon = {
  symbols: ['ETHUSDT'],
  timeframes: ['5m'],
  backDays: 365 * 2,
};

const pOrders = {
  vmid: 3,
  strategies: ['volrev'],
  split: 0.3,
  minProfit: 0.0,
};

const optimizeFor = 'topStats.ratio';
const numIterations = 10;

const space = {
  epochsMin: hpjs.quniform(5, 50, 3),
  batchSize: hpjs.quniform(16, 128, 8),
};
//optimizer: hpjs.choice(['sgd', 'adam', 'adagrad', 'rmsprop']),

(async () => {
  await dataConnect();

  const [trainOrders, testOrders] = await loadOrders({
    ...pCommon,
    ...pOrders,
  });

  console.time('Optimizing');

  const opt = await optimize(
    optimizeFor,
    space,
    numIterations,
    trainOrders,
    testOrders
  );
  console.timeEnd('Optimizing');

  console.log('Max:', opt.argmax);
  console.log('Min:', opt.argmin);
})();
