
const { TF } = require('../types/Timeframes.js');

class CandleDB {

    constructor (dbHandler, brokersSrcArray)
    {
        this.db = dbHandler;
        this.brokers = brokersSrcArray;
    }
  
    getBroker(symbol) {
        for (let b of this.brokers) {
            if (b.hasSymbol(symbol)) {
                return b;
            }
        }
        return null;
    }

    async getCandlesSince(symbol, timeframe, dateTime)
    {
        const sinceTimestamp = TF.dateToTimestamp(dateTime);
        const currentTimestamp = TF.currentTimestamp();
        return await this.getCandlesPeriod(symbol,timeframe,sinceTimestamp,currentTimestamp);
    }

    // this will load from mysql candles
    // get from broker who has symbol missing candles up to current time
    // (if required by several requests)
    // store missing candles to mysql
    // and return all candles array in a Promise

    async getCandlesPeriod( symbol, timeframe, sinceTimestamp, toTimestamp ) {
    
        const broker = this.getBroker(symbol);

        if (! broker) {
            throw new Error('CDB: broker not found for '+symbol);
        }
    
        let needBrokerSince = sinceTimestamp;
        let needBrokerTo = toTimestamp;

        let dbCandles = await 
            this.db.loadCandlesPeriod(symbol,timeframe,sinceTimestamp,toTimestamp);

        if (! dbCandles || dbCandles.length === 0) {

            let brokerCandles = await 
                broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);

            this.db.saveCandlesToDB(symbol,timeframe,brokerCandles);

            return brokerCandles;
        }

        let firstCandle = dbCandles[0];
        let lastCandle = dbCandles[dbCandles.length-1];
        
        if (PIO.candleHitsBoundary(firstCandle, sinceTimestamp)) {

            if (PIO.candleHitsBoundary(lastCandle, toTimestamp)) {
                // all period was loaded from db, cool...
                console.log('CDB: all candles from db...');
                return dbCandles;
            }

            // only first part came from db, loading rest from broker
            needBrokerSince = lastCandle.closeTime;
            needBrokerTo = toTimestamp;

            let brokerCandles = await 
                broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);

            this.db.saveCandlesToDB(symbol,timeframe,brokerCandles);
            
            console.log('CDB: first part from db, rest from broker...');

            return [... dbCandles, ... brokerCandles];     
                
        }
    
        // We know there is no begining in db

        let brokerCandlesBeforeDb = [];

        needBrokerSince = sinceTimestamp;
        needBrokerTo = firstCandle.openTime-1;

        console.log('CDB: first part broker load from '+
            TF.timestampToDate(needBrokerSince)+' to '+TF.timestampToDate(needBrokerTo) );
        
        brokerCandlesBeforeDb = await 
            broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);

        let brokerCandlesAfterDb = [];
        
        needBrokerSince = lastCandle.closeTime;
        needBrokerTo = toTimestamp;

        console.log('CDB: last part broker load from '+
            TF.timestampToDate(needBrokerSince)+' to '+TF.timestampToDate(needBrokerTo) );

        if (needBrokerSince < needBrokerTo) {
            brokerCandlesAfterDb = await 
                broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);
        }

        this.db.saveCandlesToDB(symbol,timeframe,[...brokerCandlesBeforeDb, ...brokerCandlesAfterDb]);    
        return [...brokerCandlesBeforeDb, ...dbCandles, ...brokerCandlesAfterDb];     
        
    }
  
  
  }

class PIO { /* private static */

    static candleHitsBoundary(candle,timestamp) {
        return ( (candle.openTime <= timestamp) && (candle.closeTime >= timestamp) );
    }


}


module.exports = CandleDB;