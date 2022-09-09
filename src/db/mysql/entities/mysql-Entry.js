/*
** This is mysql backend for Data
*/

const mysql = require('mysql2');
const Order = require('../types/Order.js');

class MysqlData {

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

    async loadOrders() {

        if (! this.connection ) throw new Error('MDB: no connection');

        const con = this.connection;
        const sqlQuery = "SELECT * FROM orders";

        return new Promise(function(resolve, reject) {
            if (! con ) reject(new Error('MDB: lost connection'));
            con.query( sqlQuery,
                function (err, result, fields) {
                    if (err) reject(err);

                    let orders = [];

                    result.forEach( (orderData) => {
                        orders.push( Order.fromSTORE( orderData ) );
                    })

                    return resolve(orders);
                }
            );

        });

    }

    saveOrders(orders) {

        if (! orders || orders.length == 0) return;

        var sqlQuery = `INSERT INTO orders (
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
            broker,
            result,
            closePrice,
            gain,
            takePriceReached,
            takePercentReached,
            lossPriceReached,
            lossPercentReached,
            comment,
            flags,
            tags,
            brokerORID,
            brokerSLID,
            brokerTPID,
            closeTime
        VALUES ?`;

        let values = [];

        orders.forEach( (order) => {
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
                o.broker,
                o.result,
                o.closePrice,
                o.gain,
                o.takePriceReached,
                o.takePercentReached,
                o.lossPriceReached,
                o.lossPercentReached,
                o.comment,
                o.flags,
                o.tags,
                o.brokerORID,
                o.brokerSLID,
                o.brokerTPID,
                o.closeTime           
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
          console.log("MDB: number of records inserted: " + result.affectedRows);
        });

    }


    updateOrder(order) {

        var sqlQuery = `UPDATE orders SET
            entryPrice = ?,
            takeProfit = ?,
            stopLoss = ?,
            quantity = ?,
            active = ?,
            broker = ?,
            result = ?,
            closePrice = ?,
            gain = ?,
            takePriceReached = ?,
            takePercentReached = ?,
            lossPriceReached = ?,
            lossPercentReached = ?,
            comment = ?,
            flags = ?,
            tags = ?,
            brokerORID = ?,
            brokerSLID = ?,
            brokerTPID = ?,
            closeTime = ?
        WHERE id = ?`;

        const o = order.toSTORE();
        const params = [
                o.entryPrice,
                o.takeProfit,
                o.stopLoss,
                o.quantity,
                o.active,
                o.broker,
                o.result,
                o.closePrice,
                o.gain,
                o.takePriceReached,
                o.takePercentReached,
                o.lossPriceReached,
                o.lossPercentReached,
                o.comment,
                o.flags,
                o.tags,
                o.brokerORID,
                o.brokerSLID,
                o.brokerTPID,
                o.closeTime,           
                o.id
        ];

        this.connection.query(sqlQuery, params, function (err, result) {
          if (err){
              console.log('FAILED UPDATE:');
              console.log(sqlQuery);
              console.log('VALUES:');
              console.log(params);
              throw err;
          }
          console.log("MDB: number of records updated: " + result.affectedRows);
        });

    }



}

module.exports = MysqlData;