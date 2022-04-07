const OrdersStatFilter = require('./OrdersStatFilter.js');
const { TF } = require('../../types/Timeframes.js');
const Order = require('../../types/Order.js');

const SETTINGS = require('../../../private/private.js');
const { winRatio, fnum } = require('./statfilters/helper.js');

class OrdersEmulator {

    static STAKE_USD = 100;
    static LEVERAGE = 20;
    static MARGINCALL_GAIN = -1*(OrdersEmulator.STAKE_USD / OrdersEmulator.LEVERAGE);
    
    static COST_BUY_PERCENT = 0.0004;  // 4 cents from every 100 dollars
    static COST_SELL_PERCENT = 0.0004; // 0.04 % taker comission

    static COST_PERCENT = OrdersEmulator.COST_BUY_PERCENT+OrdersEmulator.COST_SELL_PERCENT;

    static TRAILING_STOP_TRIGGER = 50; 
    static TRAILING_LOSSLESS = OrdersEmulator.COST_PERCENT;
    
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

        let flagsSnapshot = null;

        if (! SETTINGS.noFlagsSnapshot) {
            flagsSnapshot = JSON.parse(JSON.stringify(flags.getAll()));
        }

        const quantity = this.calcQuantity(entryPrice);

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
        order.setTags( this.statFilter.getTags(order, flags, this.orders) );
        order.setComment(comment);

        this.orders.push(order);
        this.activeOrders.push(order);

        const profitPreview = this.previewProfit(isLong,quantity,entryPrice,takeProfit);
        if (  profitPreview < 1 ) {
            order.setTag('PRF', 'N');
        }
        else {
            order.setTag('PRF','Y');
        }
        order.setTag('MAXPRF',profitPreview);
        order.setTag('rsi',flags.get('rsi14'));
        order.setTag('MD',flags.get('macd').d);
        order.setTag('MH',flags.get('macd').h);
        

        return order;
    }


    previewProfit(isLong, quantity, entryPrice, takeProfit)
    {
        const boughtInUSD = quantity * entryPrice;
        const soldInUSD = quantity * takeProfit;
        const commissionInUSD = soldInUSD * OrdersEmulator.COST_SELL_PERCENT +
                                boughtInUSD * OrdersEmulator.COST_BUY_PERCENT;
        let gain = 0;

        if (isLong ) {
            gain = soldInUSD - boughtInUSD - commissionInUSD;}
        else { // sell
            gain = boughtInUSD - soldInUSD - commissionInUSD;
        }
        return gain;
    }

    getOrders() {
        return this.orders;
    }

    calcQuantity(entryPrice) {
        const inUSD = OrdersEmulator.STAKE_USD;
        const priceInUSD = entryPrice;
        const qty = inUSD / priceInUSD;
        return qty;
    }

    getLastUpdateTime()
    {
        return this.lastUpdateTime;
    }

    updateClock(candle,isLive)
    {
        if (isLive) {
            this.lastUpdateTime = TF.currentTimestamp();
            return;
        }

        this.lastUpdateTime = candle.closeTime;
    }

    candleClosed(candle,isLive) {

        if ( isLive ) {
            this.candleUpdated(candle,isLive);
            return;
        }

        this.updateClock(candle, isLive);
        this.priceUpdate(candle.symbol, candle.timeframe, candle.low, candle.high, isLive);

    }

    candleUpdated(candle,isLive) {
        // it's always only live, why param?
        this.updateClock(candle, isLive);
        this.priceUpdate(candle.symbol, candle.timeframe, candle.close, candle.close, isLive);
    }

    priceUpdate(symbol, timeframe, lowPrice, highPrice, isLive)
    {
        const orders = this.activeOrders.filter( o => 
            (o.symbol === symbol) && (o.timeframe === timeframe) );
        const long  = orders.filter( o => o.isLong() );
        const short = orders.filter( o => o.isShort() );
        
        // 1. MARGIN CALLS + STOP LOSSES first

        let newPrice = null;

        short.forEach( (o) => {
            newPrice = Math.min(highPrice, o.stopLoss);
            let marginCall = this.recalcOrderGain(o, newPrice);
            if (marginCall || (newPrice >= o.stopLoss)) {
                if (o.getTagValue('tsc')) {
                    o.setTag('stl',1);
                }
                this.closeOrder(o, false);
            } 
        });

        long.forEach( (o) => {
            newPrice = Math.max(lowPrice,o.stopLoss);
            let marginCall = this.recalcOrderGain(o, newPrice);
            if (marginCall || (newPrice <= o.stopLoss)) {
                if (o.getTagValue('tsc')) {
                    o.setTag('stl',1);
                }
                this.closeOrder(o, false);
            } 
        });

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
/*
        const res = orders.reduce( (t, order) => { 
            t.gain += order.gain;
            if ( order.gain > 0 ) { t.win++ } else { t.lost++ };
            return t;
        }, { gain: 0, win: 0, lost: 0 });

        const ratio = winRatio( res.win, res.lost );

        if ( res.gain < 25 ) { return; }
*/

       return;

        // 3. Trailing stop Move

        orders.forEach( (o) => {
            if (o.isActive() && (! o.getTagValue('tsc') ) ) {
                if (o.calcTrailingReachedPercent() > OrdersEmulator.TRAILING_STOP_TRIGGER) {
                    let newStop = this.calcNewTrailingStopPrice(o);
                    o.setTag('tsc',o.stopLoss+'=>'+fnum(newStop,2));
                    o.setStopLoss(newStop);
                }
            }
        });


        // 4. check if new stop losses have been kicked out by other 

        newPrice = highPrice;
        short.forEach( (o) => {
            if ( newPrice >= o.stopLoss ) {
                this.recalcOrderGain(o, o.stopLoss);
                this.closeOrder(o, false);
                if (o.getTagValue('tsc')) {
                    o.setTag('stl',2);
                }
            } 
        });

        newPrice = lowPrice;
        long.forEach( (o) => {
            if ( newPrice <= o.stopLoss ) {
                this.recalcOrderGain(o, o.stopLoss);
                this.closeOrder(o, false);
                if (o.getTagValue('tsc')) {
                    o.setTag('stl',2);
                }
            } 
        });


    }


    calcNewTrailingStopPrice(order) {
            return order.entryPrice * 
            (1 + (order.isLong() ? 1 : -1) * OrdersEmulator.TRAILING_LOSSLESS );
    }


    recalcOrderGain(order,currentPrice)
    {
        
        order.setPrice(currentPrice);
        order.recalcGain(OrdersEmulator.COST_BUY_PERCENT, OrdersEmulator.COST_SELL_PERCENT);
/*
        if (order.getReachedPercent() > 30 ) {
            const rp = 5 * Math.floor( order.getReachedPercent() / 5 );
            for (let i = 30; i <= rp; i+=5) {
                order.setTag('RP'+i,1);
            }
        }
*/
        if (order.gain <= OrdersEmulator.MARGINCALL_GAIN) {
            order.setGain(OrdersEmulator.MARGINCALL_GAIN);
            order.setTag('MC','Y');
            return true;
        }

        return false;
    }

    closeOrder(order,isWin) {
        order.doClose(isWin,this.getLastUpdateTime());
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
