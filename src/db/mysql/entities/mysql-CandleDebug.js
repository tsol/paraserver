const TH = require('../../../helpers/time');
const CandleDebugEntry = require('../../../types/CandleDebugEntry');

const TABLE_NAME = 'candledebug';

const CREATE_LINES = [
  'time      BIGINT NOT NULL',
  'symbol    CHAR(20) NOT NULL',
  'timeframe CHAR(3) NOT NULL',
  'entries   VARCHAR(4096) DEFAULT NULL',
  'PRIMARY KEY( time, symbol, timeframe)',
];

async function prepareCandleDebug(con, vmId) {
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

async function loadCandleDebugs(
  con,
  vmId,
  { symbol, timeframe, timeFrom, timeTo }
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

  const [result] = await con.query(sql);

  return result.map((cdb) => CandleDebugEntry.fromSTORE(cdb).toGUI());
}

async function saveCandleDebugs(con, vmId, items) {
  if (!items || items.length == 0) return;
  const table = TABLE_NAME + '_' + vmId;

  const sqlQuery = `INSERT INTO ${table} 
            (symbol,timeframe,time,entries) VALUES ?`;

  let values = [];

  items.forEach((cdb) => {
    let f = cdb.toSTORE();
    values.push([f.symbol, f.timeframe, f.time, JSON.stringify(f.entries)]);
  });

  const result = await con.query(sqlQuery, [values]).catch((err) => {
    //console.log('MYSQL-CDLDBG: insert error: ', sqlQuery, values, err);

    values.forEach((v) => {
      console.log(`  STORE_INSERT_OBJ ${v[1]}-${v[2]} ` + TH.ls(v[3]));
    });

    console.log('MYSQL-CDLDBG: insert error: ', err);

    throw Error('insert failed');
  });

  console.log('MYSQL-CDLDBG: inserted rows: ', result[0].affectedRows);
  return true;
}

async function updateCandleDebug(con, vmId, obj) {
  const table = TABLE_NAME + '_' + vmId;

  const sqlQuery = `UPDATE ${table} SET entries = ? WHERE symbol = ? AND timeframe = ? AND time = ?`;
  const f = obj.toSTORE();
  let values = [JSON.stringify(f.entries), f.symbol, f.timeframe, f.time];

  const result = await con.query(sqlQuery, values).catch((err) => {
    console.log('MYSQL-CDLDBG: update error: ', sqlQuery, values, err);
    throw Error('update failed');
  });
  console.log('MYSQL-CDLDBG: updated row: ', result[0].affectedRows);
  return true;
}

async function resetCandleDebug(con, vmId) {
  const table = TABLE_NAME + '_' + vmId;
  await prepareCandleDebug(con, vmId);

  const sqlQuery = `DELETE FROM ${table}`;
  await con.query(sqlQuery);
  return true;
}

module.exports = {
  updateCandleDebug,
  loadCandleDebugs,
  saveCandleDebugs,
  resetCandleDebug,
};
