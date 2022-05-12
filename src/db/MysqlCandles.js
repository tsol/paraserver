/*
** This is mysql backend for CandleProxy candle proxy class.
**
**
*/

const mysql = require('mysql2');

const Candle = require('../types/Candle.js');

const PRICE_STORE_FORMAT = 'DECIMAL(24,12) NOT NULL';
const VOLUME_STORE_FORMAT = 'DECIMAL(24,12) NOT NULL';
const TIMESTAMP_STORE_FORMAT = 'BIGINT NOT NULL';

class MysqlCandles {

    constructor()
    {
        this.connection = null;
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
                console.log('MYSQLCANDLES: connected');
                resolve(true);
            });

        });

    }

    disconnect() {
        if (! this.connection) { return false; }

        this.connection.end(function(err) {
            if (err) throw err;
            console.log('MYSQLCANDLES: disconnected');
            this.connection = null;
        });

    }

    async loadCandlesPeriod(symbol,timeframe,startTimestamp,endTimestamp) {

        if (! this.connection ) throw new Error('MYSQLCANDLES: no connection');

        var _self = this;
        const tableName = PIO.getTableName(symbol,timeframe);
        const con = this.connection;
        const sqlQuery = 
            "SELECT * FROM "+tableName+" "
            +"WHERE "
            +"(open_time >= "+startTimestamp+")"
            +" AND "
            +"(open_time <= "+endTimestamp+")"
            +" ORDER BY open_time";


        await PIO.touchTable(this.connection, tableName);

        return new Promise(function(resolve, reject) {
      
            if (! con ) reject(new Error('MYSQLCANDLES: lost connection'));
        
            con.query( sqlQuery,
                function (err, result, fields) {
                    if (err) reject(err);

                    let candles = [];

                    result.forEach( (candleFromDb) => {
                        candles.push(PIO.parseCandleFromMYSQL(symbol,timeframe,candleFromDb));
                    })

                    return resolve(candles);
                }
            );

        });

    }

    saveCandlesToDB(symbol,timeframe,candles) {

        if (! candles || candles.length == 0) return;

        const tableName = PIO.getTableName(symbol,timeframe);

        var sqlQuery = `INSERT INTO ${tableName} 
            (open_time,open,high,low,close,volume,close_time) VALUES ?`;

        let values = [];

        candles.forEach( (c) => {
            values.push([
                c.openTime,
                c.open,
                c.high,
                c.low,
                c.close,
                c.volume,
                c.closeTime
            ]);
        })

        this.connection.query(sqlQuery, [values], function (err, result) {
          if (err){
              console.log('FAILED INSERT:');
              console.log(sqlQuery);
              console.log('VALUES:');
              console.log(values);
              throw err;
          }
          console.log("MYSQLCANDLES: number of records inserted: " + result.affectedRows);
        });

    }

}

class PIO { /* private hidden IO */
    
    static getTableName(symbol,timeframe) {
        const tableName = 'cdl_'+symbol+'_'+timeframe;
        return tableName.toLowerCase();
    }

    static touchTable(con, tableName)
    { 
        return new Promise(function(resolve, reject) {
            if (! con ) reject('MYSQLCANDLES: no connection');
        
            con.query("SHOW TABLES LIKE '"+tableName+"'",
            function (err, result, fields) {
                if (err) reject(err);
                
                if (result.length > 0) { 
                    // console.log('MDB: table already exists');
                    return resolve(true);
                }

                const sqlQuery = PIO.createTableSQLQuery(tableName);
                
                con.query(sqlQuery, function (err, result) {
                    if (err) reject (err);
                    if (!result) reject(new Error('MDB: table was not created.'));
                    console.log("MDB: new table created "+tableName);
                    resolve(false);
                });
                
            });
        });
    }

    static createTableSQLQuery(tableName) {
        const fields = [
            ['open_time'    +' '+ TIMESTAMP_STORE_FORMAT],
            ['open'         +' '+ PRICE_STORE_FORMAT],
            ['high'         +' '+ PRICE_STORE_FORMAT],
            ['low'          +' '+ PRICE_STORE_FORMAT],
            ['close'        +' '+ PRICE_STORE_FORMAT],
            ['volume'       +' '+ VOLUME_STORE_FORMAT],
            ['close_time'    +' '+ TIMESTAMP_STORE_FORMAT],
            ['PRIMARY KEY (open_time)']
        ];

        return "CREATE TABLE "+tableName+" ("
            + fields.join(', ')
            + ')';
    };

    static parseCandleFromMYSQL(symbol,timeframe,dbCandle) {
        return new Candle({
          openTime: parseFloat(dbCandle.open_time),
          open:     parseFloat(dbCandle.open),
          high:     parseFloat(dbCandle.high),
          low:      parseFloat(dbCandle.low),
          close:    parseFloat(dbCandle.close),
          volume:   parseFloat(dbCandle.volume),
          closeTime:   parseFloat(dbCandle.close_time),
          live: false,
          closed: true,
          symbol: symbol,
          timeframe: timeframe
        });
    }
     
}


module.exports = MysqlCandles;