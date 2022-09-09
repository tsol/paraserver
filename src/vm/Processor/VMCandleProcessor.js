const TH = require('../../helpers/time.js');
const { TF } = require('../../types/Timeframes.js');
const Flags = require('./Flags.js');
const CandleProcessor = require('../types/CandleProcessor.js');
const TickerProcessor = require('./TickerProcessor.js');

class VMCandleProcessor extends CandleProcessor {

    constructor(ordersManager, analyzersFactory, candleDebug, dataDb) {
        super();
        this.isLive = false;
        this.ordersManager = ordersManager;
        this.flags = new Flags();
        this.analyzersFactory = analyzersFactory;
        this.candleDebug = candleDebug;
        this.dataDb = dataDb;
        this.tickers = {};
        this.lastPrice = {};
    }


    init(symbols,timeframes,strategies) {

        for(var s of symbols){
            for(var t of timeframes) {
                const key = s+'-'+t;
                let box = 
                ( TF.get(t).pulseOnly ? null :
                    this.analyzersFactory.createBox(strategies, this.ordersManager, this,
                         this.candleDebug)
                );
                this.tickers[key] = 
                    new TickerProcessor(s,t,box);
            }
        }

    }

    getFlags() { return this.flags; }
    getTicker(symbol,timeframe) {
        const key = symbol+'-'+timeframe;
        return this.getTickerById(key);
    }
    getTickerById(key) {
        return this.tickers[ key ];
    }
    getTickersState() {
        return Object.keys(this.tickers).map( t => this.tickers[t].getState() );
    }
    getLastPrice(symbol) {
        return this.lastPrice[ symbol ];
    }

    getCandlesFrom(symbol, timeframe, closeTime) {
        const ticker = this.getTicker(symbol,timeframe);
        return ticker.getCandlesFrom(closeTime);
    }


/* candle processing */

    switchLive() {
        this.isLive = true;
        console.log('CPRO: switching live...');
    }

    priceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice) {

        //console.log('CPRO: price update '+symbol+' ['+TH.ls(eventTime)+'/'+eventTime+'] '+
        //    lowPrice+'/'+highPrice+'/'+currentPrice);
        this.lastPrice[ symbol ] = currentPrice;
        this.ordersManager.priceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice);

    }

    processPhaseStart(candleCloseTime, passedTime) {
        // prepare for candleProcess
        // console.log('CPRO: phase start '+TH.ls(candleCloseTime)+' passed: '+
        //     Number(passedTime/1000).toFixed(2)+' secs.');
    }

    processCandle(closedCandle) {
        // process closed candles
        // console.log('CPRO: closed candle '+closedCandle.symbol+'-'+closedCandle.timeframe);
    
        const ticker = this.getTicker(closedCandle.symbol,closedCandle.timeframe);

        if (ticker) {
            ticker.addCandle(closedCandle,this.flags,this.isLive);
        }

        // todo: if running live: start gathering candles on phase start
        // dump them to database upon ending

    }

    processPhaseEnd() {

        this.ordersManager.processEntriesQueue();
        
        // process orders queue, arbitration
        //console.log('CPRO: phase end');
    }

}

module.exports = VMCandleProcessor;