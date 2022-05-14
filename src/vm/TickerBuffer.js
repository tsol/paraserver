/* 
** TickerBuffer - responsible for cached candle supply for specific ticker
**
**
*/

class TickerBuffer {

    constructor(symbol,timeframe,candleProxy) {
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.candleProxy = candleProxy;

        this.buffer = [];
    }

    async loadPeriod(timeFrom,timeEnd)
    {

    }


    subscribeToBroker(srcBroker)
    {   
        this.srcBroker = srcBroker;
        this.srcBroker.subscribe(this.symbol,this.timeframe,this);
    }

    /* broker IO */
    newCandleFromBroker(candle) {
        
        if (!candle.closed) { return; }

        console.log(
                'TBUF: closed candle from broker: '+
                candle.symbol+'-'+candle.timeframe
                + ' (' + TF.timestampToDate(candle.closeTime)+ ')'
        );
        
        this.addCandle(candle);
    }

    addCandle(candle)
    {   
        this.buffer.push(candle);      
    }




 
}

module.exports = TickerBuffer;
