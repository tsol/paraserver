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

//optimizer: hpjs.choice(['sgd', 'adam', 'adagrad', 'rmsprop']),
const optimize = {
  for: 'topStats.gp',
  iterations: 20,
  space: {
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

export default { optimize, getData };
