import { quniform, choice } from 'hyperparameters';
import { dataConnect, dataDisconnect, loadOrders } from '../lib/data.mjs';

const data = {
  symbols: ['BTCUSDT', 'ETHUSDT'],
  timeframes: ['5m', '1h'],
  backDays: 365 * 2,

  vmid: 4,
  strategies: ['ttcwoff'],
  split: 0.3,
  minProfit: 0.1,
};

/*
bottom 50:  { gp: -3.863, win: 211, lost: 238, num: 449, ratio: 46.993 }
total:      { gp: -4.768, win: 436, lost: 461, num: 897, ratio: 48.606 }
top 50:     { gp: -0.904, win: 225, lost: 223, num: 448, ratio: 50.223 }
top 10:     { gp: 0.575, win: 52, lost: 37, num: 89, ratio: 58.427 }
Loss: 0.692 Accurancy: 0.528 Diffq: 1 WR boost: 3.811

 ** OPT 7: 0.5135 {lc_m: 2, lc_dp: 2, lc_dr: 2, lc_l1: 2, lc_l2: 1, lc_l3: 2, lc_l4: 0, epochsMin: 6}
 ** OPT 11: 0.5127 {lc_m: 2, lc_dp: 2, lc_dr: 2, lc_l1: 2, lc_l2: 2, lc_l3: 0, lc_l4: 3, epochsMin: 15}
 ** OPT 16: 0.5167 {lc_m: 2, lc_dp: 0, lc_dr: 2, lc_l1: 3, lc_l2: 1, lc_l3: 3, lc_l4: 3, epochsMin: 21}
 ** OPT 18: 0.5169 {lc_m: 2, lc_dp: 2, lc_dr: 2, lc_l1: 2, lc_l2: 1, lc_l3: 0, lc_l4: 3, epochsMin: 42}
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
  builds: 10,
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
