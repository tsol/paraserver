import { quniform, choice } from 'hyperparameters';
import { dataConnect, dataDisconnect, loadOrders } from '../lib/data.mjs';

const data = {
  symbols: ['BTCUSDT'],
  timeframes: ['1m'],
  backDays: 365 * 2,

  vmid: 5,
  strategies: ['ttcwoff'],
  split: 0.2,
  minProfit: 0.07,
};

/*
 */

const build = {
  epochsMin: 5,
  batchSize: 32,

  layersComposerIndex: 0, // use layers composer feature of buildNewModel

  lc_m: 2,
  lc_dp: 2,
  lc_dr: 2,
  lc_l1: 2,
  lc_l2: 1,
  lc_l3: 2,
  lc_l4: 0,
  epochsMin: 6,

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

const optimize = {
  for: 'acc', //'topStats.ratio',
  iterations: 20,
  builds: 7,
  space: {
    lc_m: quniform(0, 3, 1),
    lc_dp: quniform(0, 3, 1),
    lc_dr: quniform(0, 3, 1),
    lc_l1: quniform(0, 3, 1),
    lc_l2: quniform(0, 3, 1),
    lc_l3: quniform(0, 3, 1),
    lc_l4: quniform(0, 3, 1),

    epochsMin: quniform(5, 50, 3),

    //epochsMin: choice([12, 30]),
    //batchSize: choice([112, 88]),
  },
};

const getData = async () => {
  await dataConnect();
  let [trainOrders, testOrders] = await loadOrders(data);
  await dataDisconnect();

  //testOrders = testOrders.filter((o) => o.tags.MAXPRF.value >= 0.5);

  return [trainOrders, testOrders];
};

export default { optimize, build, getData };
