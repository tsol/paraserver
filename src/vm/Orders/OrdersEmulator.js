
const CDB = require('../../types/CandleDebug');

const OrderTaggers = require('./taggers/OrderTaggers.js');
const { TF } = require('../../types/Timeframes.js');
const TH = require('../../helpers/time');

const Order = require('../../types/Order.js');

const SETTINGS = require('../../../private/private.js');
const { winRatio, fnum } = require('../../reports/helper.js');

class OrdersEmulator {

/*
    static SHTDN_MAX_RISK_USD = -40;
    static SHTDN_REQ_SAME_TYPE = 66.6;
    static SHTDN_REQ_BELOW_TAKE_REACHED = 5;
    static SHTDN_REQ_BELOW_LOSS_REACHED = 60;

    static RISK_REAL_USD = 250;

    static TRAILING_STOP_TRIGGER = 50; 
    static TRAILING_LOSSLESS = (this.params.COST_BUY_PERCENT+this.params.COST_SELL_PERCENT) * 2;
*/

    constructor(brokerCandles) {        
        this.params = {};

        // todo: params from private.js, later from users prefs in db

        this.params.STAKE_USD = 100; /* stake using leverage */
        this.params.LEVERAGE = 20;
        this.params.MARGINCALL_GAIN = -1*(this.params.STAKE_USD / this.params.LEVERAGE);
        this.params.COST_BUY_PERCENT = 0.0004;  // 4 cents from every 100 dollars
        this.params.COST_SELL_PERCENT = 0.0004; // 0.04 % taker comission
    

        this.orders = [];
        this.activeOrders = [];
        this.limitOrders = [];

        this.taggers = new OrderTaggers(this.params);
        this.brokerCandles = brokerCandles;

        this.lastUpdateTime = null;
    }

    reset() {
        this.orders = [];
        this.taggers.reset();
    }
    
    // ordersManager (candleProcessor) IO:

    priceUpdate (symbol,eventTime,lowPrice,highPrice,currentPrice)
    {
        this.lastUpdateTime = eventTime;

        const orders = this.activeOrders.filter( o => (o.symbol === symbol) );
        let long  = orders.filter( o => o.isLong() );
        let short = orders.filter( o => o.isShort() );
        
        // 1. MARGIN CALLS + STOP LOSSES first

        let newPrice = null;

        short.forEach( (o) => {
            newPrice = Math.min(highPrice, o.stopLoss);
            this.recalcOrderGain(o, newPrice);

            if ( this.isMarginCallReached(o) || (newPrice >= o.stopLoss) ) {
                this.closeOrder(o, false);
            } 
        });

        long.forEach( (o) => {
            newPrice = Math.max(lowPrice,o.stopLoss);
            this.recalcOrderGain(o, newPrice);
            if (this.isMarginCallReached(o) || (newPrice <= o.stopLoss)) {
                this.closeOrder(o, false);
            } 
        });

        short = short.filter( o => o.isActive() );
        long = long.filter( o => o.isActive() );

        // 2. take profits

        newPrice = lowPrice;
        short.forEach( (o) => {
            if (o.isActive() && (newPrice <= o.takeProfit)) {
                this.recalcOrderGain(o, o.takeProfit);
                this.closeOrder(o, true);
            } 
        });

        newPrice = highPrice;
        long.forEach( (o) => {
            if (o.isActive() && (newPrice >= o.takeProfit)) {
                this.recalcOrderGain(o, o.takeProfit);
                this.closeOrder(o, true);
            } 
        });


        this.limitOrdersPriceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice);

        return;

    }


    limitOrdersPriceUpdate (symbol,eventTime,lowPrice,highPrice,currentPrice)
    {
        let orders = this.limitOrders.filter( o => (o.symbol === symbol) );

        orders.forEach( (o) => {
            if (o.isLong) {
                if (highPrice >= o.entryPrice) {
                    console.log('OEMU: limit BUY order TRIGGERED '+o.symbol+'-'+o.timeframe
                    +' '+TH.ls(eventTime)+' ('+eventTime+')');
                    this.killLimitOrder(o);
                    this.marketOrder(o);
                }
            }
            else {
                if (lowPrice <= o.entryPrice) {
                    console.log('OEMU: limit SELL order TRIGGERED '+o.symbol+'-'+o.timeframe
                    +' '+TH.ls(eventTime)+' ('+eventTime+')');

                    this.killLimitOrder(o);
                    this.marketOrder(o);
                }                
            } 
        });

        orders = this.limitOrders.filter( o => (o.symbol === symbol) );

        orders.forEach( o => {
            if (eventTime >= o.expire) {
                this.killLimitOrder(o);
                console.log('OEMU: limit order timeout '+o.symbol+'-'+o.timeframe
                +' '+TH.ls(eventTime)+' ('+eventTime+')');
            }
        });

    }


    limitOrder( params ) {
        console.log('OEMU: new limit order: '+params.symbol+'-'+params.timeframe+' '
        + TH.ls(params.time) +'('+params.time+') -> '+TH.ls(params.expire)+' ('+params.expire+')');
        this.limitOrders.push(params);
    }

    killLimitOrder(order) {
        this.limitOrders = this.limitOrders.filter( o => o !== order );
    }

    marketOrder({
        time,
        strategy,
        symbol,
        timeframe,
        isLong,
        entryPrice, 
        takeProfit, 
        stopLoss,
        comment,
        flags,
        candle
    }) {

        /*
        
        // TODO: move to tagger (dynamic tagger)

        const totalRisk = this.calcActiveOrdersMaxLoss(); 

        console.log('OEMU: new order '+symbol+'/'+strategy+' total_risk='+totalRisk+
            ' orders='+this.activeOrders.length);

        if (Math.abs(totalRisk) > this.params.RISK_REAL_USD ) {
            //console.log('OEMU: ABOVE RISK ')
            return null;
        }
        */

        let flagsSnapshot = null;

        if (! SETTINGS.noFlagsSnapshot) {
            flagsSnapshot = JSON.parse(JSON.stringify(flags.getAll()));
        }

        let quantity = 0;
        let aligned = null;
        try {        
            aligned = this.brokerCandles.getAlignedOrderDetails(symbol,entryPrice,
                this.params.STAKE_USD,stopLoss,takeProfit);
            stopLoss = aligned.stopLoss;
            takeProfit = aligned.takeProfit;
            quantity = aligned.quantity;

        } catch (e) {
            console.log("BAD ORDER PARAMS: "+e.message);
            return null;
        }

        const order = new Order({
            time: time,
            strategy: strategy,
            symbol: symbol,
            timeframe: timeframe,
            isLong: isLong,
            entryPrice: entryPrice,
            quantity: quantity,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            candle: candle
        });

        order.setFlags(flagsSnapshot);
  
        order.setTags( this.taggers.getTags(order, flags, this.orders, order.tags) );
        order.setComment(comment);

        /* filter */

        //if (! ((order.tags.WRK.value=='P')&&(order.tags.NYC.value=='P')&&(order.tags.MCORR.value=='N')) ) { return null; }
        //if (order.tags.CU5.value !== 'Y') { return null; }
        
        CDB.setSource(strategy);
        CDB.labelTop(candle,'EN');
        CDB.circleMiddle(candle,{ color: 'blue', radius: 5, alpha: 0.1 });
        CDB.entry(candle,entryPrice,takeProfit,stopLoss);

        this.orders.push(order);
        this.activeOrders.push(order);
        return order;

    }

    calcActiveOrdersMaxLoss()
    {
        const ml = this.activeOrders.reduce( (sum, o) => sum+o.getTagValue('MAXLSS'), 0 );
        return ml;
    }

    getOrders() {
        return this.orders;
    }


    scheduleMinutely() {
        return;
/*
    static SHTDN_MAX_RISK_USD = -40;
    static SHTDN_REQ_SAME_TYPE = 66.6;
    static SHTDN_REQ_BELOW_TAKE_REACHED = 5;
    static SHTDN_REQ_BELOW_LOSS_REACHED = 60;
*/
        if (this.activeOrders.length < 30) { return; }
        
        let byTime = {};

        let orders = this.activeOrders.filter( o => {
            return (o.lossPercentReached > o.takePercentReached);
        });

        for ( var o of orders ) {
            if (! byTime[ o.time ]) { byTime[ o.time ] = []; }
            byTime[ o.time ].push(o);
        }

        for ( var tm in byTime ) {
            let arr = byTime[tm];
            if (! arr || arr.length <= 20 ) { continue; }
    
            let cnt = arr.length;
            let gain = arr.reduce( (sum, order) => sum + order.gain, 0 );
    
            console.log('OEMU: many_orders '+TH.ls(this.lastUpdateTime)
                +' start='+tm+' cnt='+cnt+' gain='+gain);
            
            if ( (gain / cnt > 3.5) || (gain / cnt < -2.5) ) {
                this.closeAll(arr);
            }

        }

    }


    closeAll(ordersArray) {
        let orders = (ordersArray || this.activeOrders);
        console.log('OEMU: closing all');
        console.log(orders);
        orders.forEach( o => this.closeOrder(o, o.gain > 0) && o.setTag('SHTDN','Y') );
    }

   
    closeOrder(order,isWin) {
        order.doClose(isWin,this.lastUpdateTime);
        this.activeOrders = this.activeOrders.filter( o => o !== order );
    }

    toJSON() {
        return this.orders.map( (v) => {
            return v.toGUI();
        });
    }

    getOrderById(orderId) {
        if (! this.orders || this.orders.length === 0) { return null; }
        return this.orders.find( v => v.id == orderId );
    }

    getOpenOrder(symbol, timeframe, strategy)
    {
        if (! this.activeOrders || this.activeOrders.length === 0) { return false; }

        const found = this.activeOrders.find( 
            (v) => {
                return     (v.symbol == symbol)
                        && (v.timeframe == timeframe) 
                        && (v.strategy == strategy); 
            }
        );

        return found;
    }

    // todo: move to separate reports module
    genStatistics(fromTimestamp, toTimestamp) {

        if (! this.orders || this.orders.length === 0) { return []; }

        if (! fromTimestamp ) {
            fromTimestamp = 0;
        }

        if (! toTimestamp ) {
            toTimestamp = TH.currentTimestamp()+60000;
        }

        let uniqSS = {};  // unique SYMBOL-STRATEGY hash
        let accSST = {};  // SYMBOL-STRATEGY-TIMEFRAME accumulator

        for (let order of this.orders) {

            if (order.active
                || (order.time < fromTimestamp)
                || (order.time > toTimestamp )
            ) { continue; }

            let idSS = order.symbol+'-'+order.strategy;
            let idSST = idSS+'-'+order.timeframe;

            if (! uniqSS[ idSS ]) {
                uniqSS[ idSS ] = { 
                    symbol: order.symbol,
                    strategy: order.strategy,
                    win: 0, lost: 0, gain: 0
                };
            }

            if (! accSST[ idSST ]) {
                accSST[ idSST ] = {
                    symbol: order.symbol,
                    strategy: order.strategy,
                    timeframe: order.timeframe,
                    win: 0, lost: 0, gain: 0
                };
            }

            if (order.gain > 0) {
                accSST[ idSST ].win++;
                uniqSS[ idSS ].win++;
            }
            else {
                accSST[ idSST ].lost++;
                uniqSS[ idSS ].lost++;
            }

            accSST[ idSST ].gain += order.gain;
            uniqSS[ idSS ].gain += order.gain;

        }

        let res = [];

        Object.keys(uniqSS).forEach( (idSS) => {
            
            const u = uniqSS[ idSS ];

            let reportLine = {
                symbol: u.symbol,
                strategy: u.strategy,
                entries: (u.win+u.lost),
                ratio: winRatio(u.win,u.lost),
                gain: fnum(u.gain,2)
            };

            TF.TFRAMES.forEach( (t) => {
                const timeframe = t.name;

                const idSST = u.symbol+'-'+u.strategy+'-'+timeframe;
                if (! accSST[ idSST ]) {
                    reportLine[timeframe+'_entries'] = 0;
                    reportLine[timeframe+'_ratio'] = 0;
                    reportLine[timeframe+'_gain'] = 0;
                }
                else {
                    let a = accSST[ idSST ];
                    reportLine[timeframe+'_entries'] = a.win + a.lost;
                    reportLine[timeframe+'_ratio'] = winRatio(a.win, a.lost);
                    reportLine[timeframe+'_gain'] = fnum(a.gain,2);
                }

            });

            res.push(reportLine);

        });

        return res;
    }

 
    /* helpers */

    recalcOrderGain(order,currentPrice)
    {
        order.setPrice(currentPrice);
        order.recalcGain(this.params.COST_BUY_PERCENT, this.params.COST_SELL_PERCENT);
    }

    isMarginCallReached(order) {
        if (order.gain <= this.params.MARGINCALL_GAIN) {
            order.setGain(this.params.MARGINCALL_GAIN);
            order.setTag('MC','Y');
            return true;
        }
        return false;
    }




}

module.exports = OrdersEmulator;
