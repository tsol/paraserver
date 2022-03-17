/*
    In future this should  be subscription dispatcher

*/

const CDB = require('../types/CandleDebug');
const OrdersStatFilter = require('./OrdersStatFilter.js');
const { TF } = require('../types/Timeframes.js');

class OrdersManager {

    static STAKE_USD = 100;
    static COST_BUY_PERCENT = 0.001;
    static COST_SELL_PERCENT = 0.001;
    
    constructor() {
        this.orders = [];
        this.statFilter = new OrdersStatFilter();
    }

    reset() {
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
 
        const flagsSnapshot = JSON.parse(JSON.stringify(flags.getAll()));

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
            maxPriceReached: 0,
            reachedPercent: 0,

            comment: comment,
            strategyObject: strategyObject
        };

        order.qty = this.riskManageGetQty(order);
    
        this.orders.push(order);

        //console.log('OM: new order BUY '+orderId);
        
        const passTrade = this.statFilter.
            passTrade(order.symbol, order.timeframe, order.strategy);

        if (passTrade) {
            order.comment += ' REAL';
        }

        return orderId;
    }

    riskManageGetQty(order) {
        const inUSD = OrdersManager.STAKE_USD;
        const priceInUSD = order.entryPrice;
        const qty = inUSD / priceInUSD;
        return qty;
    }

    candleClosed(candle,isLive) {
        this.priceUpdated(candle.symbol, candle.timeframe, candle.high, isLive);
        this.priceUpdated(candle.symbol, candle.timeframe, candle.low, isLive);
    }

    candleUpdated(candle,isLive) {
        this.priceUpdated(candle.symbol, candle.timeframe, candle.close, isLive);
    }

    priceUpdated(symbol, timeframe, newPrice, isLive) {
        //console.log('OM: price update '+symbol+' = '+newPrice);

        const orders = this.orders.filter( o => 
            o.active && (o.symbol === symbol) && (o.timeframe === timeframe) );

        orders.forEach( (o) => {

            if (o.type === 'buy') {

                if (newPrice > o.maxPriceReached)
                    { o.maxPriceReached = newPrice; }

                if (newPrice >= o.takeProfit)
                    { this.closeOrder(o.id, newPrice, 'won'); }

                else if (newPrice <= o.stopLoss)
                    { this.closeOrder(o.id, newPrice, 'lost') }
            }
            else { // sell 

                if (newPrice < o.maxPriceReached)
                    { o.maxPriceReached = newPrice; }

                if (newPrice <= o.takeProfit)
                    { this.closeOrder(o.id, newPrice, 'won'); }
                    
                else if (newPrice >= o.stopLoss)
                    { this.closeOrder(o.id, newPrice, 'lost') }

            }

        });

    }

    closeOrder(orderId,price,result) {
        const order = this.orders.find( o => o.id === orderId );

        if (! order) {
            throw new Error('OM: order not found on close order: '+orderId);
        }
        if (! price ) {
            throw new Error('OM zero price');
        }

        const boughtInUSD = order.qty * order.entryPrice;
        const soldInUSD = order.qty * price;
        const commissionInUSD = soldInUSD * OrdersManager.COST_SELL_PERCENT -
                                boughtInUSD * OrdersManager.COST_BUY_PERCENT;

        order.active = false;                
        order.closePrice = price;
        order.result = result;
        order.reachedPercent = 100;

        if ( result === 'lost' ) {
            let height = Math.abs(order.maxPriceReached - order.entryPrice);
            let target = Math.abs(order.takeProfit - order.entryPrice);
            let coef = toFixedNumber( (height / target) * 100, 2);
            order.reachedPercent = coef;
        }

        if (order.type === 'buy') {
            order.gain = soldInUSD - boughtInUSD - commissionInUSD;

        }
        else { // sell
            order.gain = boughtInUSD - soldInUSD - commissionInUSD;
        }

        this.statFilter.addTrade(
            order.symbol, order.timeframe, order.strategy, 
            (result === 'won' ? true : false ),
            order.strategyObject
        );

    }

    toJSON() {
        return this.orders;
    }

    getOpenOrder(symbol, timeframe, strategy)
    {
        if (! this.orders || this.orders.length === 0) { return false; }

        const found = this.orders.find( 
            (v) => {
                return     (v.symbol == symbol)
                        && (v.timeframe == timeframe) 
                        && (v.strategy == strategy)
                        && (v.active); 
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
                ratio: calcWinLooseRatio(u.win,u.lost),
                gain: toFixedNumber(u.gain,2)
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
                    reportLine[timeframe+'_ratio'] = calcWinLooseRatio(a.win, a.lost);
                    reportLine[timeframe+'_gain'] = toFixedNumber(a.gain,2);
                }

            });

            res.push(reportLine);

        });

        return res;
    }

}


function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  toFixedNumber(ratio,2);
}

function toFixedNumber(num, digits){
    var pow = Math.pow(10, digits);
    return Math.round(num*pow) / pow;
}


module.exports = OrdersManager;

