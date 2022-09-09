/*
** This is mysql backend for Data
*/

const mysql = require('mysql2');

const DBProviderInterface = require('../types/DBProviderInterface');

const { updateCandleDebug, saveCandleDebug, resetCandleDebug, loadCandleDebugs,  }
    = require('./entities/mysql-CandleDebug');

class MysqlProvider extends DBProviderInterface {

    constructor()
    {
        this.connection = null;
    }

    getCandleDebugIO() {
        return {
            update: updateCandleDebug,
            save: saveCandleDebug,
            load: loadCandleDebugs,
            reset: resetCandleDebug
        }
    }

    connect({host, database, user, password })
    {      
        var _self = this;
        return new Promise(function(resolve, reject) {
        
            var con = mysql.createConnection({
                host: host,
                user: user,
                password: password,
                database: database
            });
      
            con.connect(function(err) {
                if (err) return reject(err);
                _self.connection = con;
                console.log('MYSQLDB: connected');
                resolve(con);
            });

        });

    }

    disconnect() {
        if (! this.connection) { throw new Error('MYSQLDB: not connected') }

        this.connection.end(function(err) {
            if (err) throw err;
            console.log('MYSQLDB: disconnected');
            this.connection = null;
        });

    }


}

module.exports = MysqlProvider;