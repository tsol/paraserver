
const SETTINGS = require('../../private/private.js');
const { TF } = require('../types/Timeframes.js');


class TickerProcessor {

    constructor(symbol,timeframe,limit,flags,ordersManager,analyzersBox,srcBroker) {
    
        this.ordersManager = ordersManager;
        this.flags = flags;
        
        this.candles = [];
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.limit = limit;

        this.srcBroker = srcBroker;
        this.isLive = false;
        this.analyzersBox = analyzersBox;              
    }

    subscribeToBroker()
    {   
        if (! this.srcBroker ) { return false; }
        this.srcBroker.subscribe(this.symbol,this.timeframe,'ticker-'+this.getId(),this);
        this.isLive = true;
    }

    unsubscribeFromBroker() {
        if (! this.srcBroker) { return false; }
        this.srcBroker.unsubscribe(this.symbol, this.timeframe,'ticker-'+this.getId());
        this.isLive = false;
    }

    isLive() { return this.isLive };
   
    setFlagsObject(flagsObject) {
        this.flags = flagsObject;
    }

    getId() {
        return this.symbol+'-'+this.timeframe;
    }

    getCurrentPrice()  {
        if (this.candles.length < 1) {
            console.error('no candles to get current price');
            return 0;
        }
        const lastCandle = this.candles[this.candles.length - 1];
        return lastCandle.close;
    }

    /* broker IO */
    newCandleFromBroker(candle) {
        
        if (candle.closed)
        {
            const d = new Date().toLocaleTimeString();
            console.log(
                'TICKER: '+
                candle.symbol+'-'+candle.timeframe
                + ' ('+ d + ' == ' + TF.timestampToDate(candle.closeTime)
                + ') IsClosed: '+candle.closed
            );
        };

        this.addCandle(candle);
    }

    addCandle(candle)
    {
        
        //console.log('CANDLE: '+candle.symbol+'-'+candle.timeframe+' : '
        //+TF.timestampToDate(candle.openTime) + ' -> ' +TF.timestampToDate(candle.closeTime)
        //+ ' ['+(candle.closed ? 'CLOSED' : 'OPEN')+'] close='+candle.close );

        if (candle.timeframe == SETTINGS.pulseTimeframe) { 
            this.ordersManager.pulseCandle(candle, this.isLive);                
            return;
        }

        if (!candle.closed) {
            this.ordersManager.candleUpdated(candle, this.isLive);
            return;
        }

        this.candles.push(candle);

        while (this.candles.length > this.limit) {
            this.forgetFirstCandle();
        }

        this.flags.start(this.symbol, this.timeframe);
        this.flags.set('is_live', this.isLive);
        
        this.ordersManager.candleClosed(candle, this.isLive);
        this.analyzersBox.addCandle(candle, this.flags);
        
    }

    forgetFirstCandle() {
        const firstCandle = this.candles.shift();
        this.analyzersBox.forgetBefore(firstCandle.openTime);
    }

    getState() {
        return {
             'id': this.getId(),
             'symbol': this.symbol,
             'timeframe': this.timeframe,
             'limit': this.limit,
             'isLive': this.isLive,
             'firstTimestamp': this.getFirstTimestamp(),
             'lastTimestamp': this.getLastTimestamp()
        };
     }
 

    getChart(limit, targetTimestamp) {
        
        const currentTimestamp = this.getLastTimestamp();
        const firstTimestamp = this.getFirstTimestamp();

        if (! firstTimestamp) {
            return null;
        }
        let wasTarget = true;
        if (! targetTimestamp) { targetTimestamp = currentTimestamp; wasTarget=false; }
        if (! limit ) { limit = 1000; }
        
        const tfLen = TF.getTimeframeLength(this.timeframe);
        const periodLen = tfLen * limit;
        const halfPeriod = Math.floor(periodLen/2);

        let endTimestamp = targetTimestamp + halfPeriod;
        let startTimestamp = targetTimestamp - halfPeriod;

        // shift limit right 
        if (startTimestamp < firstTimestamp) {
            const diff = firstTimestamp - startTimestamp;
            startTimestamp = firstTimestamp;
            endTimestamp += diff;
        }
        // shift limit left
        if (endTimestamp > currentTimestamp) {
            const diff = endTimestamp - currentTimestamp;
            endTimestamp = currentTimestamp;
            startTimestamp -= diff;
        }

        // truncate left wing (less than limit return) 
        if (startTimestamp < firstTimestamp) {
            startTimestamp = firstTimestamp;
        }

        return {
            id: this.getId(),
            candles: this.candles.filter(
                 c => (c.openTime >= startTimestamp) && (c.closeTime <= endTimestamp)
            ),
            targetTimestamp: (wasTarget ? targetTimestamp : null)
        }
    }


    getFirstTimestamp() {
        if (this.candles.length == 0) {
            return null;
        }
        return this.candles[0].openTime;
    }


    getLastTimestamp() {
        if (this.candles.length == 0) {
            return null;
        }
        return this.candles[this.candles.length - 1].closeTime;
    }


}

module.exports = TickerProcessor;
