
const OrdersStatFilter = require('./OrdersStatFilter.js');
const { TF } = require('../../types/Timeframes.js');

const SETTINGS = require('../../../private/private.js');
const { winRatio, fnum } = require('./statfilters/helper.hs');

class OrdersEmulator {

    static STAKE_USD = 100;
    static LEVERAGE = 20;
    static MARGINCALL_GAIN = -1*(OrdersEmulator.STAKE_USD / OrdersEmulator.LEVERAGE);
    static COST_BUY_PERCENT = 0.001;
    static COST_SELL_PERCENT = 0.001;
    
    constructor() {
        this.orders = [];
        this.activeOrders = [];
        this.statFilter = new OrdersStatFilter();
    }

    reset() {
        this.lastUpdateTime = null;
        this.orders = [];
        this.statFilter.reset();
    }
    
    newOrder(
            type,
            flags, 
            strategyObject, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            symbol,
            timeframe,
            time,
            comment
    ) {

        const tickerId = symbol+'-'+timeframe;
        const orderId = tickerId+'-'+strategyObject.getId()+'-'+time;
 
        let flagsSnapshot = null;
        
        if (! SETTINGS.fast) {
            flagsSnapshot = JSON.parse(JSON.stringify(flags.getAll()));
        }

        const order = {
            id: orderId,
            time: time,
            type: type,
            symbol: symbol,
            timeframe: timeframe,
            strategy: strategyObject.getId(),
            
            entryPrice: entryPrice,
            takeProfit: takeProfit,
            stopLoss: stopLoss,

            flags: flagsSnapshot,

            active: true,
            result: 'active',
            closePrice: 0,
            gain: 0,
            maxPriceReached: entryPrice,
            reachedPercent: 0,

            comment: comment,
            strategyObject: strategyObject
        };

        order.qty = this.riskManageGetQty(order);
    
        const tags = this.statFilter.getTags(order, flags, this.orders);
        order.comment += this.statFilter.tagsStringify(tags);
        order.tags = tags;

        this.orders.push(order);
        this.activeOrders.push(order);

        return order;
    }



    riskManageGetQty(order) {
        const inUSD = OrdersEmulator.STAKE_USD;
        const priceInUSD = order.entryPrice;
        const qty = inUSD / priceInUSD;
        return qty;
    }

    getLastUpdateTime()
    {
        return this.lastUpdateTime;
    }

    candleClosed(candle,isLive) {
        
        if (this.lastUpdateTime < candle.closeTime) {
            this.lastUpdateTime = candle.closeTime;
        }

        this.priceUpdated(candle.symbol, candle.timeframe, candle.high, isLive);
        this.priceUpdated(candle.symbol, candle.timeframe, candle.low, isLive);
    }

    candleUpdated(candle,isLive) {

        if (this.lastUpdateTime < candle.openTime) {
            this.lastUpdateTime = candle.openTime;
        }

        this.priceUpdated(candle.symbol, candle.timeframe, candle.close, isLive);
    }

    priceUpdated(symbol, timeframe, newPrice, isLive) {
        //console.log('OM: price update '+symbol+' = '+newPrice);

        const orders = this.activeOrders.filter( o => 
            (o.symbol === symbol) && (o.timeframe === timeframe) );

        orders.forEach( (o) => {

            let marginCall = this.recalcOrderGain(o, newPrice);

            if (marginCall) {
                this.closeOrder(o, newPrice, 'lost');
            } 
            else if (o.type === 'buy') {

                if (newPrice >= o.takeProfit)
                    { this.closeOrder(o, newPrice, 'won'); }

                else if (newPrice <= o.stopLoss)
                    { this.closeOrder(o, newPrice, 'lost') }
            }
            else { // sell 

                if (newPrice <= o.takeProfit)
                    { this.closeOrder(o, newPrice, 'won'); }
                    
                else if (newPrice >= o.stopLoss)
                    { this.closeOrder(o, newPrice, 'lost') }

            }

        });

    }



    recalcOrderGain(order,currentPrice)
    {
        
        const boughtInUSD = order.qty * order.entryPrice;
        const soldInUSD = order.qty * currentPrice;
        const commissionInUSD = soldInUSD * OrdersEmulator.COST_SELL_PERCENT -
                                boughtInUSD * OrdersEmulator.COST_BUY_PERCENT;

        if (order.type === 'buy') {
            order.gain = soldInUSD - boughtInUSD - commissionInUSD;

            if ( currentPrice > order.maxPriceReached)
                { order.maxPriceReached = currentPrice; }
        }
        else { // sell
            order.gain = boughtInUSD - soldInUSD - commissionInUSD;

            if ( currentPrice < order.maxPriceReached)
                { order.maxPriceReached = currentPrice; }    
        }
        
        const priceDiff = order.maxPriceReached - order.entryPrice;

        const target = Math.abs(order.takeProfit - order.entryPrice);
        const coef = toFixedNumber( Math.abs(priceDiff / target) * 100, 2);
        order.reachedPercent = ( coef < 100 ? coef : 100 );
      
        if (order.gain <= OrdersEmulator.MARGINCALL_GAIN) {
            order.gain = OrdersEmulator.MARGINCALL_GAIN;
            order.tags.MC = { value: 'Y' };
            return true;
        }

        return false;
    }

    closeOrder(order,price,result) {

        order.active = false;                
        order.closePrice = price;
        order.result = result;

        this.activeOrders = this.activeOrders.filter( o => o !== order );

        order.comment += ' MC:'+ ( order.tags.MC ? 'Y' : 'N' ); 

    }

    toJSON() {
        return this.orders.map( (v) => {
            return {
                id: v.id,
                time: v.time,
                type: v.type,
                symbol: v.symbol,
                timeframe: v.timeframe,
                strategy: v.strategy,
                entryPrice: v.entryPrice,
                takeProfit: v.takeProfit,
                stopLoss: v.stopLoss,
                active: v.active,
                result: v.result,
                closePrice: v.closePrice,
                gain: toFixedNumber(v.gain, 3),
                maxPriceReached: v.maxPriceReached,
                reachedPercent: v.reachedPercent,
                comment:  v.comment,
                qty: v.qty ,
                flags: {}   
            }
        });
    }

    getOrderById(orderId) {
        if (! this.orders || this.orders.length === 0) { return null; }
        return this.orders.find( v => v.id == orderId );
    }

    getOpenOrder(symbol, timeframe, strategy)
    {
        if (! this.orders || this.orders.length === 0) { return false; }

        const found = this.activeOrders.find( 
            (v) => {
                return     (v.symbol == symbol)
                        && (v.timeframe == timeframe) 
                        && (v.strategy == strategy); 
            }
        );

        return found;
    }

    genStatistics(fromTimestamp, toTimestamp) {

        if (! this.orders || this.orders.length === 0) { return []; }

        if (! fromTimestamp ) {
            fromTimestamp = 0;
        }

        if (! toTimestamp ) {
            toTimestamp = TF.currentTimestamp()+60000;
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

}


module.exports = OrdersEmulator;

