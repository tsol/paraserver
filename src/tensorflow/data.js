const SETTINGS = require('../../private/private.js');

const MysqlCandles = require('../db/mysql/MysqlCandles.js');
const MysqlProvider = require('../db/mysql/MysqlProvider.js');
const DBAccessFactory = require('../db/DBAccessFactory.js');

async function load(
  opts = { vmid, symbol, timeframe, strategy, timeFrom, timeTo }
) {
  if (!opts?.vmid) throw new Error('vmid is required');

  const dbCandles = new MysqlCandles();
  const dbAccessFactory = new DBAccessFactory(new MysqlProvider());

  await dbAccessFactory.connect(SETTINGS.databases.mysqlData);
  await dbCandles.connect(SETTINGS.databases.mysqlCandles);

  // async loadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp) {

  const candles = await dbCandles.loadCandlesPeriod(
    opts.symbol,
    opts.timeframe,
    opts.timeFrom,
    opts.timeTo
  );

  const ordersIO = dbAccessFactory.makeOrdersIO(opts.vmid);
  const orders = (await ordersIO.load(opts)).filter((o) => o.active !== 'Y');

  return { orders, candles };
}

module.exports = { load };
