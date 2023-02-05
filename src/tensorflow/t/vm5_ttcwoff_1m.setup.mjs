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
opt for 'acc':

** OPT 7: 0.5000 {lc_m: 2, lc_dp: 2, lc_dr: 2, lc_l1: 2, lc_l2: 1, lc_l3: 2, lc_l4: 0, epochsMin: 6}
** OPT 35: 0.5079 {lc_m: 2, lc_dp: 1, lc_dr: 3, lc_l1: 2, lc_l2: 2, lc_l3: 0, lc_l4: 0, epochsMin: 9}
** OPT 49: 0.5051 {lc_m: 1, lc_dp: 2, lc_dr: 3, lc_l1: 1, lc_l2: 3, lc_l3: 2, lc_l4: 2, epochsMin: 9}
** OPT 84: 0.5010 {lc_m: 3, lc_dp: 1, lc_dr: 1, lc_l1: 2, lc_l2: 3, lc_l3: 2, lc_l4: 3, epochsMin: 39}
** OPT 93: 0.5001 {lc_m: 1, lc_dp: 1, lc_dr: 3, lc_l1: 0, lc_l2: 2, lc_l3: 2, lc_l4: 0, epochsMin: 6}
** OPT 178: 0.5007 {lc_m: 0, lc_dp: 2, lc_dr: 1, lc_l1: 3, lc_l2: 1, lc_l3: 1, lc_l4: 3, epochsMin: 18}
** OPT 199: 0.5003 {lc_m: 3, lc_dp: 0, lc_dr: 2, lc_l1: 1, lc_l2: 1, lc_l3: 0, lc_l4: 2, epochsMin: 27}
** OPT 201: 0.5072 {lc_m: 3, lc_dp: 1, lc_dr: 2, lc_l1: 0, lc_l2: 0, lc_l3: 2, lc_l4: 2, epochsMin: 6}
** OPT 218: 0.5011 {lc_m: 1, lc_dp: 1, lc_dr: 2, lc_l1: 3, lc_l2: 3, lc_l3: 2, lc_l4: 0, epochsMin: 15}
** OPT 242: 0.5013 {lc_m: 3, lc_dp: 1, lc_dr: 1, lc_l1: 2, lc_l2: 1, lc_l3: 2, lc_l4: 0, epochsMin: 24}
** OPT 277: 0.5001 {lc_m: 2, lc_dp: 0, lc_dr: 1, lc_l1: 2, lc_l2: 1, lc_l3: 2, lc_l4: 1, epochsMin: 27}

*/

const build = {
  epochsMin: 5,
  batchSize: 64,

  layersComposerIndex: 0, // use layers composer feature of buildNewModel

  lc_m: 2,
  lc_dp: 1,
  lc_dr: 3,
  lc_l1: 2,
  lc_l2: 2,
  lc_l3: 0,
  lc_l4: 0,
  epochsMin: 9,

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
  for: 'wrBoost', //'topStats.ratio', 'acc'
  iterations: 10,
  builds: 6,
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
