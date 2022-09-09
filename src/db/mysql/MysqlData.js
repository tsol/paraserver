/*
** This is mysql backend for Data
*/

const mysql = require('mysql2');

import { updateCandleDebug, loadCandleDebugs, saveCandleDebug } from './entities/mysql-CandleDebug';

class MysqlData {

    constructor()
    {
        this.connection = null;
    }

    updateCandleDebug(params = {vmId, symbol, timeframe, time, data}) {
        return updateCandleDebug( { con: this.connection, ... params });
    }

    saveCandleDebug(params = {vmId, symbol, timeframe, time, data}) {
        return saveCandleDebug( { con: this.connection, ... params });
    }

    async loadCandleDebugs(params = {vmId, symbol, timeframe, timeFrom, timeTo}) { 
            return loadCandleDebugs( { con: this.connection, ... params });
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
                console.log('MDB: connected');
                resolve(true);
            });

        });

    }

    disconnect() {
        if (! this.connection) { return false; }

        this.connection.end(function(err) {
            if (err) throw err;
            console.log('MDB: disconnected');
            this.connection = null;
        });

    }


}

module.exports = MysqlData;