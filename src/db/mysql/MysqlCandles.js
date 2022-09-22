/*
** This is mysql backend for CandleProxy candle proxy class.
*/

const mysql = require('mysql2/promise');

const Candle = require('../../types/Candle.js');
const DBCandlesInterface = require('../types/DBCandlesInterface.js');

const PRICE_STORE_FORMAT = 'DECIMAL(24,12) NOT NULL';
const VOLUME_STORE_FORMAT = 'DECIMAL(24,12) NOT NULL';
const TIMESTAMP_STORE_FORMAT = 'BIGINT NOT NULL';

class MysqlCandles extends DBCandlesInterface {

    constructor()
    {
        super();
        this.connection = null;
    }

    async connect({host, database, user, password })
    {      
        this.connection = await mysql.createConnection({
                host: host,
                user: user,
                password: password,
                database: database
        });
      
        await this.connection.connect();
        console.log('MYSQL-CANDLES: connected');
        return true;
    }

    async disconnect() {
        await this.connection.end();
        this.connection = null;
        console.log('MYSQL-CANDLES: disconnected');
    }

    async getFirstCandle(symbol,timeframe) {
        const tableName = PIO.getTableName(symbol,timeframe);
        const con = this.connection;    
        const sqlQuery = 
            `SELECT * FROM ${tableName} ORDER BY open_time ASC LIMIT 1`;
        await PIO.touchTable(con, tableName);
        let [result, meta] = await con.query( sqlQuery );
        if (result && result.length > 0) {
            return PIO.parseCandleFromMYSQL(symbol,timeframe,result[0]);
        }
        return null;
    }


    async getLastCandle(symbol,timeframe) {
        const tableName = PIO.getTableName(symbol,timeframe);
        const con = this.connection;    
        const sqlQuery = 
            `SELECT * FROM ${tableName} ORDER BY close_time DESC LIMIT 1`;
        await PIO.touchTable(con, tableName);
        let [result, meta] = await con.query( sqlQuery );
        if (result && result.length > 0) {
            return PIO.parseCandleFromMYSQL(symbol,timeframe,result[0]);
        }
        return null;
    }


    async loadCandlesPeriod(symbol,timeframe,startTimestamp,endTimestamp) {

        const tableName = PIO.getTableName(symbol,timeframe);
        const con = this.connection;
        const sqlQuery = 
            "SELECT * FROM "+tableName+" "
            +"WHERE "
            +"(close_time >= "+startTimestamp+")"
            +" AND "
            +"(open_time <= "+endTimestamp+")"
            +" ORDER BY close_time";

        await PIO.touchTable(this.connection, tableName);
     
        const [result, meta] = await con.query( sqlQuery );

        let candles = [];

        result.forEach( (candleFromDb) => {
            candles.push(PIO.parseCandleFromMYSQL(symbol,timeframe,candleFromDb));
        })

        return candles;
    }

    async saveCandlesToDB(symbol,timeframe,candles) {

        if (! candles || candles.length == 0) return;

        const tableName = PIO.getTableName(symbol,timeframe);

        var sqlQuery = `INSERT IGNORE INTO ${tableName} 
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

        const [result, meta] = await this.connection.query(sqlQuery, [values])
            .catch(err => {
                console.log('FAILED INSERT:',sqlQuery,values,err);
                return false;
            });
        
        console.log("MYSQL-CANDLES: inserted rows: " + result.affectedRows);
        
    }

}

class PIO { /* private hidden IO */
    
    static getTableName(symbol,timeframe) {
        const tableName = 'cdl_'+symbol+'_'+timeframe;
        return tableName.toLowerCase();
    }

    static async touchTable(con, tableName)
    { 
        const [resultShow] = await con.query(`SHOW TABLES LIKE '${tableName}'`);
        if (resultShow.length > 0) { return true; }
        
        const sqlQuery = PIO.createTableSQLQuery(tableName);
        const [resultCreate] = await con.query(sqlQuery);

        console.log("MYSQL-CANDLES: new table created "+tableName);
        return false;
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