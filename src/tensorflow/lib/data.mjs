import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// const path = require('path');
// const root = path.resolve(__dirname, '..', '..', '..', '..');
// const someModule = require(path.join(root, 'lib', 'someModule'));

const SETTINGS = require('../../../private/private.js');

const MysqlCandles = require('../../db/mysql/MysqlCandles.js');
const MysqlProvider = require('../../db/mysql/MysqlProvider.js');
const DBAccessFactory = require('../../db/DBAccessFactory.js');

const CandleReadCache = require('../../services/CandleReadCache');
const { dataSplit } = require('./helpers');

const TH = require('../../helpers/time');

const dbAccessFactory = new DBAccessFactory(new MysqlProvider());
const dbCandles = new MysqlCandles();

export async function dataConnect() {
  await dbCandles.connect(SETTINGS.databases.mysqlCandles);
  await dbAccessFactory.connect(SETTINGS.databases.mysqlData);
}

export async function dataDisconnect() {
  await dbCandles.disconnect();
  await dbAccessFactory.disconnect();
}

export async function loadOrders({
  vmid,
  symbols,
  timeframes,
  strategies,
  backDays,
  split,
  minProfit,
}) {
  const ordersIO = dbAccessFactory.makeOrdersIO(vmid);

  const loaderOpts = {
    timeFrom: TH.timestampDaysBack(backDays),
    timeTo: TH.currentTimestamp(),
  };

  let orders = [];

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      for (const strategy of strategies) {
        const addOrders = await ordersIO.load({
          ...loaderOpts,
          symbol,
          timeframe,
          strategy,
        });
        orders = orders.concat(addOrders.filter((o) => o.active !== 'Y'));
      }
    }
  }

  if (minProfit > 0) {
    orders = orders.filter((o) => o.tags.MAXPRF.value >= minProfit);
  }

  const [trainOrders, testOrders] = dataSplit(orders, split);
  return [trainOrders, testOrders];
}

export async function loadCandles({ symbols, timeframes, backDays }) {
  const loaderOpts = {
    timeFrom: TH.timestampDaysBack(backDays),
    timeTo: TH.currentTimestamp(),
  };

  let candles = [];

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const moreCandles = await dbCandles.loadCandlesPeriod({
        ...loaderOpts,
        symbol,
        timeframe,
      });
      candles = candles.concat(moreCandles);
    }
  }

  const candleReadCache = new CandleReadCache({ limit: Infinity });
  candles.forEach((c) => candleReadCache.addCandle(c));

  return candleReadCache;
}
