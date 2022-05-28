
const OrderTaggers = require('./taggers/OrderTaggers.js');
const { TF } = require('../../types/Timeframes.js');
const TH = require('../../helpers/time');

const Order = require('../../types/Order.js');

const SETTINGS = require('../../../private/private.js');
const { winRatio, fnum } = require('../../reports/helper.js');

class OrdersEmulator {

    static SHTDN_MAX_RISK_USD = -40;
    static SHTDN_REQ_SAME_TYPE = 66.6;
    static SHTDN_REQ_BELOW_TAKE_REACHED = 5;
    static SHTDN_REQ_BELOW_LOSS_REACHED = 60;

    static RISK_REAL_USD = 250;

    static STAKE_USD = 100; /* stake using leverage */
    static LEVERAGE = 20;
    static MARGINCALL_GAIN = -1*(OrdersEmulator.STAKE_USD / OrdersEmulator.LEVERAGE);
    
    static COST_BUY_PERCENT = 0.0004;  // 4 cents from every 100 dollars
    static COST_SELL_PERCENT = 0.0004; // 0.04 % taker comission

    static COST_PERCENT = OrdersEmulator.COST_BUY_PERCENT+OrdersEmulator.COST_SELL_PERCENT;

    static TRAILING_STOP_TRIGGER = 50; 
    static TRAILING_LOSSLESS = OrdersEmulator.COST_PERCENT * 2;
    
    constructor(brokerCandles) {
        this.orders = [];
        this.activeOrders = [];
        this.taggers = new OrderTaggers();
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


        return;

    }



    newOrder(
        time,
        strategy,
        symbol,
        timeframe,
        isLong,
        entryPrice, 
        takeProfit, 
        stopLoss,
        comment,
        flags
    ) {

        /*
        const totalRisk = this.calcActiveOrdersMaxLoss(); 

        console.log('OEMU: new order '+symbol+'/'+strategy+' total_risk='+totalRisk+
            ' orders='+this.activeOrders.length);

        if (Math.abs(totalRisk) > OrdersEmulator.RISK_REAL_USD ) {
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
                OrdersEmulator.STAKE_USD,stopLoss,takeProfit);
            stopLoss = aligned.stopLoss;
            takeProfit = aligned.takeProfit;
            quantity = aligned.quantity;

        } catch (e) {
            console.log("BAD ORDER PARAMS: "+e.message);
            return null;
        }


/* margin call SL/TP bound */
        
        let oldStopLoss = stopLoss;
        let oldTakeProfit = takeProfit;
        let newStopLoss = stopLoss;
        let newTakeProfit = takeProfit;

        [ newStopLoss, newTakeProfit ] = this.correctMarginCallSLTP(
             entryPrice, isLong, stopLoss, takeProfit,
             quantity, -1*OrdersEmulator.MARGINCALL_GAIN
        );
        
        if (newStopLoss !== stopLoss) {
            
            /* filter */
            return null;
            
            try {        
                aligned = this.brokerCandles.getAlignedOrderDetails(symbol,entryPrice,
                OrdersEmulator.STAKE_USD,newStopLoss,newTakeProfit);
                newStopLoss = aligned.stopLoss;
                newTakeProfit = aligned.takeProfit;
            } catch (e) {
                console.log("BAD ORDER PARAMS: "+e.message);
                return null;
            }
        }

        // stopLoss = newStopLoss;
        // takeProfit = newTakeProfit;

/* / margin call */

        const order = new Order({
            time: time,
            strategy: strategy,
            symbol: symbol,
            timeframe: timeframe,
            isLong: isLong,
            entryPrice: entryPrice,
            quantity: quantity,
            stopLoss: stopLoss,
            takeProfit: takeProfit
        });

        order.setFlags(flagsSnapshot);

        const profitPreview = this.previewProfit(isLong,
            order.quantity,order.entryPrice,order.takeProfit); 
        order.setTag('MAXPRF',fnum(profitPreview,3));

        const lossPreview = this.previewProfit(isLong,
            order.quantity,order.entryPrice,order.stopLoss); 
        order.setTag('MAXLSS',fnum(lossPreview,3));

        if ( oldStopLoss !== newStopLoss ) {
            order.setTag('MCORR','Y');
            order.setTag('MCORR_SL',oldStopLoss+' => '+newStopLoss);
        }
        else {
            order.setTag('MCORR','N');
        }
  
        order.setTags( this.taggers.getTags(order, flags, this.orders, order.tags) );
        order.setComment(comment);

        /* filter */
        if (order.tags.CU5.value !== 'Y') { return null; }

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
        
        if (this.activeOrders.length < 30) { return; }
        
        let byTime = {};

        let orders = this.activeOrders.filter( o => {
            return (o.lossPercentReached > o.takePercentReached);
        });

        for ( var o of orders ) {
            if (! byTime[ o.time ]) { byTime[ o.time ] = []; }
            byTime[ o.time ].push(o);
        }

        //console.log('OEMU: MORE THAN 30 ORDERS '+TH.ls(this.lastUpdateTime));
        //console.log(byTime);

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
        order.recalcGain(OrdersEmulator.COST_BUY_PERCENT, OrdersEmulator.COST_SELL_PERCENT);
    }

    isMarginCallReached(order) {
        if (order.gain <= OrdersEmulator.MARGINCALL_GAIN) {
            order.setGain(OrdersEmulator.MARGINCALL_GAIN);
            order.setTag('MC','Y');
            return true;
        }
        return false;
    }

    correctMarginCallSLTP(entryPrice, isLong, stopLoss, takeProfit, quantity, positiveTargetLoss)
    {
        const newStopLoss =
         this.calcTargetLossPrice(positiveTargetLoss, entryPrice, isLong, quantity);

        if (    (isLong && (newStopLoss <= stopLoss))
            || (!isLong && (newStopLoss >= stopLoss))
        ) { return [stopLoss, takeProfit]; }
     
        const ratio = Math.abs(entryPrice-newStopLoss) / Math.abs(entryPrice-stopLoss);
        const oldTakeHeight = entryPrice - takeProfit;
        const newTakeProfit = entryPrice - 1*oldTakeHeight*ratio;

        return [ newStopLoss, newTakeProfit ];
    }


    /* */
    calcTargetLossPrice(positiveTargetLoss, entryPrice, isLong, quantity)
    {
        const z = ( isLong ? 1 : -1);
        const res = (( entryPrice * (z - OrdersEmulator.COST_BUY_PERCENT) - positiveTargetLoss / quantity )
            / (OrdersEmulator.COST_SELL_PERCENT + z));
        return res;
    }

    previewProfit(isLong, quantity, entryPrice, takeProfit)
    {
        const boughtInUSD = quantity * entryPrice;
        const soldInUSD = quantity * takeProfit;
        const commissionInUSD = soldInUSD * OrdersEmulator.COST_SELL_PERCENT +
                                boughtInUSD * OrdersEmulator.COST_BUY_PERCENT;
        let gain = 0;

        if (isLong ) {
            gain = soldInUSD - boughtInUSD - commissionInUSD;
        } else { // sell
            gain = boughtInUSD - soldInUSD - commissionInUSD;
        }
        return gain;
    }


}

module.exports = OrdersEmulator;
