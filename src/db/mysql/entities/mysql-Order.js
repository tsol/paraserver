const TH = require('../../../helpers/time');
const Order = require('../../../types/Entry.js');

const TABLE_NAME = 'orders';

const CREATE_LINES = [
  'id char(80) NOT NULL PRIMARY KEY',
  `time BIGINT NOT NULL DEFAULT 0`,
  `type enum('buy','sell') DEFAULT null`,
  `symbol CHAR(28) NOT NULL DEFAULT ''`,
  `timeframe CHAR(3) NOT NULL DEFAULT ''`,
  `strategy CHAR(28) NOT NULL DEFAULT ''`,
  'entryPrice DECIMAL(24,12) NOT NULL',
  'takeProfit DECIMAL(24,12) NOT NULL',
  'stopLoss DECIMAL(24,12) NOT NULL',
  'quantity DECIMAL(24,12) DEFAULT NULL',
  `active enum('Y','N') DEFAULT 'Y'`,
  `result enum('won','lost','active') DEFAULT 'active'`,
  'closePrice DECIMAL(24,12) DEFAULT NULL',
  'gain DECIMAL(24,12) NOT NULL DEFAULT 0',
  'gainPercent float NOT NULL DEFAULT 0',
  'takePriceReached float NOT NULL DEFAULT 0',
  'takePercentReached float NOT NULL DEFAULT 0',
  'lossPriceReached float NOT NULL DEFAULT 0',
  'lossPercentReached float NOT NULL DEFAULT 0',
  'comment VARCHAR(4096) DEFAULT NULL',
  'flags MEDIUMTEXT DEFAULT NULL',
  'tags MEDIUMTEXT DEFAULT NULL',
  'closeTime BIGINT NOT NULL',
  'KEY (time, symbol, timeframe)',
];

async function prepareOrders(con, vmId) {
  const table = TABLE_NAME + '_' + vmId;

  const resExists = await con.query(`SHOW TABLES LIKE '${table}'`);
  if (resExists[0].length > 0) {
    return true;
  }

  const sqlQuery = `CREATE TABLE ${table} (` + CREATE_LINES.join(', ') + ')';

  console.log(sqlQuery);

  const resCreate = await con.query(sqlQuery);
  return true;
}

async function loadOrders(
  con,
  vmId,
  { symbol, timeframe, timeFrom, timeTo, strategy, type }
) {
  const table = TABLE_NAME + '_' + vmId;

  let sql = `SELECT * FROM ${table} WHERE 1=1`;

  if (symbol) {
    sql += ` AND symbol='${symbol}'`;
  }
  if (timeframe) {
    sql += ` AND timeframe='${timeframe}'`;
  }
  if (timeFrom) {
    sql += ` AND time >= ${timeFrom}`;
  }
  if (timeTo) {
    sql += ` AND time <= ${timeTo}`;
  }
  if (strategy) {
    sql += ` AND strategy='${strategy}'`;
  }
  if (type) {
    sql += ` AND type='${type}'`;
  }

  const [result] = await con.query(sql);

  return result.map((cdb) => Order.fromSTORE(cdb));
}

async function saveOrders(con, vmId, orders) {
  if (!orders || orders.length == 0) return;
  const table = TABLE_NAME + '_' + vmId;

  const sqlQuery = `INSERT INTO ${table} (
                id,
                time,
                type,
                symbol,
                timeframe,
                strategy,
                entryPrice,
                takeProfit,
                stopLoss,
                quantity,
                active,
                result,
                closePrice,
                gain,
                gainPercent,
                takePriceReached,
                takePercentReached,
                lossPriceReached,
                lossPercentReached,
                comment,
                flags,
                tags,
                closeTime
            ) VALUES ?`;

  let values = [];

  orders.forEach((order) => {
    let o = order.toSTORE();
    values.push([
      o.id,
      o.time,
      o.type,
      o.symbol,
      o.timeframe,
      o.strategy,
      o.entryPrice,
      o.takeProfit,
      o.stopLoss,
      o.quantity,
      o.active,
      o.result,
      o.closePrice,
      o.gain,
      o.gainPercent,
      o.takePriceReached,
      o.takePercentReached,
      o.lossPriceReached,
      o.lossPercentReached,
      o.comment,
      o.flags,
      o.tags,
      o.closeTime,
    ]);
  });

  const result = await con.query(sqlQuery, [values]).catch((err) => {
    console.log('MYSQL-ORDRS: insert error: ', err, sqlQuery);
    throw Error('insert failed');
  });

  console.log('MYSQL-ORDRS: inserted rows: ', result[0].affectedRows);
  return true;
}

async function updateOrder(con, vmId, obj) {
  const table = TABLE_NAME + '_' + vmId;

  const sqlQuery = `UPDATE ${table} SET 
    active = ?,
    result = ?,
    closeTime = ?,
    closePrice = ?,
    gain = ?,
    gainPercent = ?,
    takePriceReached = ?,
    takePercentReached = ?,
    lossPriceReached = ?,
    lossPercentReached = ?
  WHERE id = ?`;

  const f = obj.toSTORE();

  let values = [
    f.active,
    f.result,
    f.closeTime,
    f.closePrice,
    f.gain,
    f.gainPercent,
    f.takePriceReached,
    f.takePercentReached,
    f.lossPriceReached,
    f.lossPercentReached,
    f.id,
  ];

  const result = await con.query(sqlQuery, values).catch((err) => {
    console.log('MYSQL-ORDRS: update error: ', sqlQuery, values, err);
    throw Error('update failed');
  });
  console.log('MYSQL-ORDRS: updated row: ', result[0].affectedRows);
  return true;
}

async function resetOrders(con, vmId) {
  const table = TABLE_NAME + '_' + vmId;
  await prepareOrders(con, vmId);
  const sqlQuery = `DELETE FROM ${table}`;
  await con.query(sqlQuery);
  return true;
}

module.exports = {
  updateOrder,
  loadOrders,
  saveOrders,
  resetOrders,
};
