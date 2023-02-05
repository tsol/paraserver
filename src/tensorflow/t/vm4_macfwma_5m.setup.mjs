import { quniform, choice } from 'hyperparameters';
import { dataConnect, dataDisconnect, loadOrders } from '../lib/data.mjs';

const data = {
  symbols: ['BTCUSDT'],
  timeframes: ['5m'],
  backDays: 365 * 2,

  vmid: 4,
  strategies: ['macwfma'],
  split: 0.3,
  minProfit: 0.5,
};

/*
for 'acc'
** OPT 8: 0.5933 {lc_m: 2, lc_dp: 1, lc_dr: 2, lc_l1: 0, lc_l2: 3, lc_l3: 2, lc_l4: 1, epochsMin: 15}
** OPT 1: 0.5929 {lc_m: 0, lc_dp: 3, lc_dr: 0, lc_l1: 1, lc_l2: 2, lc_l3: 1, lc_l4: 0, epochsMin: 12}
** OPT 6: 0.5929 {lc_m: 2, lc_dp: 2, lc_dr: 1, lc_l1: 1, lc_l2: 3, lc_l3: 2, lc_l4: 2, epochsMin: 24}
** OPT 7: 0.5929 {lc_m: 2, lc_dp: 2, lc_dr: 2, lc_l1: 2, lc_l2: 1, lc_l3: 2, lc_l4: 0, epochsMin: 6}
** OPT 9: 0.5929 {lc_m: 1, lc_dp: 1, lc_dr: 3, lc_l1: 2, lc_l2: 3, lc_l3: 0, lc_l4: 1, epochsMin: 15}
** OPT 11: 0.5929 {lc_m: 2, lc_dp: 2, lc_dr: 2, lc_l1: 2, lc_l2: 2, lc_l3: 0, lc_l4: 3, epochsMin: 15}
** OPT 16: 0.5929 {lc_m: 2, lc_dp: 0, lc_dr: 2, lc_l1: 3, lc_l2: 1, lc_l3: 3, lc_l4: 3, epochsMin: 21}
 */

const build = {
  epochsMin: 50,
  batchSize: 64,
  validationSplit: 0.3,

  layersComposerIndex: 0,

  lc_m: 2,
  lc_dp: 0,
  lc_dr: 2,
  lc_l1: 3,
  lc_l2: 1,
  lc_l3: 3,
  lc_l4: 3,
  epochsMin: 21,

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
    // [
    //   order.tags['LR.T'].value,
    //   order.tags['LR.S'].value,
    //   order.tags['LR.M'].value,
    // ],
  ],
};

const optimize = {
  for: 'acc', //'topStats.ratio',
  iterations: 2,
  builds: 2,
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
  return [trainOrders, testOrders];
};

export default { optimize, build, getData };
