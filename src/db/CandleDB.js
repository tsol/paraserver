
/*
** CandleDB - is a caching proxy for loading candles.
**
** It stores retreived candles in database, and the ones missing -
** requests from one of brokers, who can provide those symbols.
**
** Once retreived from broker those candles a stored in database
** for future cached access.
**
** This class allows much quicker data reload debug when developing strategies
** and modifying the engine.
*/

const { TF } = require('../types/Timeframes.js');

class CandleDB {

    constructor (dbHandler, brokers)
    {
        this.db = dbHandler;
        this.brokers = brokers;
    }
  

    async getClosedCandlesSince(symbol, timeframe, sinceTimestamp, useBroker)
    {
        const currentTimestamp = TF.currentTimestamp();
        return await this.getCandlesPeriod(symbol,timeframe,sinceTimestamp,currentTimestamp, useBroker);
    }

    // this will load from mysql candles
    // get from broker who has symbol missing candles up to current time
    // (if required by several requests)
    // store missing candles to mysql (only closed ones!)
    // and return all candles array in a Promise

    async getCandlesPeriod( symbol, timeframe, sinceTimestamp, toTimestamp, useBroker ) {
      
        let dbCandles = await 
            this.db.loadCandlesPeriod(symbol,timeframe,sinceTimestamp,toTimestamp);

        if (! useBroker ) {
            return dbCandles;
        }

        const broker = this.brokers.getFor(symbol);

        let needBrokerSince = sinceTimestamp;
        let needBrokerTo = toTimestamp;

        if (! dbCandles || dbCandles.length === 0) {

            let brokerCandles = await 
                broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);

            PIO.removeUnclosedCandles(brokerCandles);
            this.db.saveCandlesToDB(symbol,timeframe,brokerCandles);

            return brokerCandles;
        }

        let firstCandle = dbCandles[0];
        let lastCandle = dbCandles[dbCandles.length-1];
        
        if (PIO.candleHitsBoundary(firstCandle, sinceTimestamp)) {

            if (PIO.candleHitsBoundary(lastCandle, toTimestamp)) {
                // all period was loaded from db, cool...
                console.log('CDB: DB_ONLY ('+symbol+'-'+timeframe+') '
                    +TF.timestampToDate(sinceTimestamp)
                    +' <- DB -> '
                    +TF.timestampToDate(toTimestamp)
                );
                return dbCandles;
            }

            // only first part came from db, loading rest from broker
            needBrokerSince = lastCandle.closeTime;
            needBrokerTo = toTimestamp;

            console.log('CDB: DB-BROKER ('+symbol+'-'+timeframe+') '
                +TF.timestampToDate(sinceTimestamp)
                +' <- DB -> '
                +TF.timestampToDate(needBrokerSince)
                +' <- BROKER -> '
                +TF.timestampToDate(needBrokerTo)
            );

            let brokerCandles = await 
                broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);

            PIO.removeUnclosedCandles(brokerCandles);
            this.db.saveCandlesToDB(symbol,timeframe,brokerCandles);
            
            return [... dbCandles, ... brokerCandles];     
                
        }
    
        // We know there is no begining in db

        let brokerCandlesBeforeDb = [];

        needBrokerSince = sinceTimestamp;
        needBrokerTo = firstCandle.openTime-1;

        console.log('CDB: BROKER-DB-? ('+symbol+'-'+timeframe+') '
            +TF.timestampToDate(needBrokerSince)
            +' <- BROKER -> '
            +TF.timestampToDate(needBrokerTo)
            +' <- DB -> '
            +TF.timestampToDate(lastCandle.closeTime-1)
            +' <- ? -> '
            +TF.timestampToDate(toTimestamp)
        );
        
        brokerCandlesBeforeDb = await 
            broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);

        let brokerCandlesAfterDb = [];
        
        needBrokerSince = lastCandle.closeTime;
        needBrokerTo = toTimestamp;

        if (needBrokerSince < needBrokerTo) {
  
            console.log('CDB: ?-DB-BROKER ('+symbol+'-'+timeframe+') '
                +TF.timestampToDate(sinceTimestamp)
                +' <- DB-BROKER1 -> '
                +TF.timestampToDate(needBrokerSince)
                +' <- BROKER -> '
                +TF.timestampToDate(needBrokerTo)
            );
 
            brokerCandlesAfterDb = await 
                broker.loadCandlesPeriod(symbol,timeframe,needBrokerSince,needBrokerTo);
            PIO.removeUnclosedCandles(brokerCandlesAfterDb);
        }

        this.db.saveCandlesToDB(symbol,timeframe,[...brokerCandlesBeforeDb, ...brokerCandlesAfterDb]);    
        return [...brokerCandlesBeforeDb, ...dbCandles, ...brokerCandlesAfterDb];     
        
    }
  
  
  }

class PIO { /* private static */

    static candleHitsBoundary(candle,timestamp) {
        return ( (candle.openTime <= timestamp) && (candle.closeTime >= timestamp) );
    }

    static removeUnclosedCandles(candlesArray)
    {
        if (! candlesArray || candlesArray.length == 0) {
            return false;
        }
        let lc = candlesArray[candlesArray.length-1];
        if (!lc.closed) {
            console.log('CDB: removed last candle from array was not closed');
            console.log(lc.symbol+'-'+lc.timeframe
                +' open: '+TF.timestampToDate(lc.openTime)
                +' close: '+TF.timestampToDate(lc.closeTime)
            );
            candlesArray.pop();
        }

    }


}


module.exports = CandleDB;