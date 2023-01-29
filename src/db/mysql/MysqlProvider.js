/*
 ** This is mysql backend for Data
 */

const mysql = require('mysql2/promise');

const DBProviderInterface = require('../types/DBProviderInterface');

const {
  updateCandleDebug,
  saveCandleDebugs,
  resetCandleDebug,
  loadCandleDebugs,
} = require('./entities/mysql-CandleDebug');

const {
  updateOrder,
  saveOrders,
  resetOrders,
  loadOrders,
} = require('./entities/mysql-Order');

class MysqlProvider extends DBProviderInterface {
  constructor() {
    super();
    this.connection = null;
  }

  getCandleDebugIO() {
    return {
      update: updateCandleDebug,
      save: saveCandleDebugs,
      load: loadCandleDebugs,
      reset: resetCandleDebug,
    };
  }

  getOrdersIO() {
    return {
      update: updateOrder,
      save: saveOrders,
      load: loadOrders,
      reset: resetOrders,
    };
  }

  async connect({ host, database, user, password }) {
    const con = await mysql.createConnection({
      host: host,
      user: user,
      password: password,
      database: database,
    });

    this.connection = con;

    // await prepareCandleDebug(con);
    // await prepareOrders(con);

    return con;
  }

  disconnect() {
    if (!this.connection) {
      throw new Error('MYSQLDB: not connected');
    }
    return this.connection.end();
  }
}

module.exports = MysqlProvider;
