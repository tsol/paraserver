import { quniform } from 'hyperparameters';
import { dataConnect, dataDisconnect, loadOrders } from '../lib/data.mjs';

const data = {
  symbols: ['ETHUSDT', 'BTCUSDT', 'BNBUSDT'],
  timeframes: ['5m'],
  backDays: 365 * 2,

  vmid: 3,
  strategies: ['volrev'],
  split: 0.3,
  minProfit: 0.0,
};

const build = {
  epochsMin: 30,

  layersComposerIndex: 0, // use layers composer feature of buildNewModel

  inputsFn: (order) => [
    [order.isLong ? 1 : 0],
    [
      Number(order.entryPrice),
      order.flags.emac9,
      order.flags.emac21,
      order.flags.emac50,
      order.flags.emac100,
      order.flags.emac200,
    ],
    [order.flags.rsi14 / 100],
    [(order.flags.macd.h + 100) / 200],
    [
      order.tags['LR.T'].value,
      order.tags['LR.S'].value,
      order.tags['LR.M'].value,
    ],
  ],
};

//optimizer: hpjs.choice(['sgd', 'adam', 'adagrad', 'rmsprop']),
const optimize = {
  for: 'acc', //'topStats.ratio',
  iterations: 20,
  space: {
    lc_m: quniform(0, 3, 1),
    lc_dp: quniform(0, 3, 1),
    lc_dr: quniform(0, 3, 1),
    lc_l1: quniform(0, 3, 1),
    lc_l2: quniform(0, 3, 1),
    lc_l3: quniform(0, 3, 1),
    lc_l4: quniform(0, 3, 1),
    epochsMin: quniform(5, 50, 3),
    batchSize: quniform(16, 128, 8),
  },
};

const getData = async () => {
  await dataConnect();
  const [trainOrders, testOrders] = await loadOrders(data);
  await dataDisconnect();
  return [trainOrders, testOrders];
};

export default { optimize, build, getData };
