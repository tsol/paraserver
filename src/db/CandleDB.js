
class CandleDB {

    constructor (dbHandler, brokersSrcArray)
    {
    }
  
    getCandlesSince( symbol, timeframe, date ) {
    
    // this will load from mysql candles
    // get from broker who has symbol missing candles up to current time
    // (if required by several requests)
    // store missing candles to mysql
    // and return all candles array in a Promise
    
     
    }
  
  
  }

module.exports = CandleDB;