/*
** This is main data store enpoint
**
** for each separate entity / task generates access functions using factories
**
*/

class DBAccessFactory {

    constructor(dbProvider)
    {
        this.db = dbProvider;
        this.connection = null;
    }

    makeCandleDebugIO(vmId) {
        const con = this.connection;
        const { save, update, reset, load } = this.db.getCandleDebugIO();
        return {
            update: o => update( { con, vmId, ... o.toSTORE() }),
            save: o => save( { con, vmId, ... o.toSTORE() }),
            load: params => load( { con, vmId, ... params } ),
            reset: () => reset( { con, vmId } )
        }
    }

    async connect(params)
    {
        await this.db.connect(params).then( (connection) => {
            this.connection = connection;
        })
    }

    disconnect() {
        this.db.disconnect();
    }

}

module.exports = DBAccessFactory;