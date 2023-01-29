/*
 ** This is main data store enpoint
 **
 ** for each separate entity / task generates access functions using factories
 **
 */

class DBAccessFactory {
  constructor(dbProvider) {
    this.db = dbProvider;
    this.connection = null;
  }

  makeCandleDebugIO(vmId) {
    const con = this.connection;
    const { save, update, reset, load } = this.db.getCandleDebugIO();
    return {
      // todo: change o.toSTORE from here to just o
      update: (obj) => update(con, vmId, obj),
      save: (objArray) => save(con, vmId, objArray),
      load: (params) => load(con, vmId, params),
      reset: () => reset(con, vmId),
    };
  }

  makeOrdersIO(vmId) {
    const con = this.connection;
    const { prepare, save, update, reset, load } = this.db.getOrdersIO();
    return {
      update: (obj) => update(con, vmId, obj),
      save: (objArray) => save(con, vmId, objArray),
      load: (params) => load(con, vmId, params),
      reset: () => reset(con, vmId),
    };
  }

  async connect(params) {
    return this.db.connect(params).then((connection) => {
      this.connection = connection;
    });
  }

  disconnect() {
    return this.db.disconnect();
  }
}

module.exports = DBAccessFactory;
