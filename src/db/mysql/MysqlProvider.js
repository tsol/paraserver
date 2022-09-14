/*
** This is mysql backend for Data
*/

const mysql = require('mysql2/promise');

const DBProviderInterface = require('../types/DBProviderInterface');

const { updateCandleDebug, saveCandleDebugs, resetCandleDebug, loadCandleDebugs, prepareCandleDebug  }
    = require('./entities/mysql-CandleDebug');

class MysqlProvider extends DBProviderInterface {

    constructor()
    {
        this.connection = null;
    }

    getCandleDebugIO() {
        return {
            update: updateCandleDebug,
            save: saveCandleDebugs,
            load: loadCandleDebugs,
            reset: resetCandleDebug
        }
    }

    async connect({host, database, user, password })
    {      
        const con = await mysql.createConnection({
            host: host,
            user: user,
            password: password,
            database: database
        });
        
        this.connection = con;

        await prepareCandleDebug(con);

        return con;
    }

    disconnect() {
        if (! this.connection) { throw new Error('MYSQLDB: not connected') }
        return this.connection.end();
    }


}

module.exports = MysqlProvider;