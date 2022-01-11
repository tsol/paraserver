/*
    In future this should  be subscription dispatcher

*/

const CDB = require('../types/CandleDebug');
const { TF } = require('../types/Timeframes.js');

class OrdersManager {

    static STAKE_USD = 100;

    constructor() {
        this.orders = [];
    }

    reset() {
        this.orders = [];
    }
    
    newOrderBuy(
            flags, 
            strategyId, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            symbol,
            timeframe,
            time,
            comment
    ) {

        const tickerId = symbol+'-'+timeframe;
        const orderId = tickerId+'-'+strategyId+'-'+time;
 
        const flagsSnapshot = JSON.parse(JSON.stringify(flags.getAll()));

        const order = {
            id: orderId,
            time: time,
            type: 'buy',
            symbol: symbol,
            timeframe: timeframe,
            strategy: strategyId,
            
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

            comment: comment
        };

        order.qty = this.riskManageGetQty(order);
    
        this.orders.push(order);

        console.log('OM: new order BUY '+orderId);

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

            if (newPrice > o.maxPriceReached) {
                o.maxPriceReached = newPrice;
            }

            if (newPrice >= o.takeProfit) {
                this.closeOrder(o.id, newPrice, 'won');
            }
            else if (newPrice <= o.stopLoss) {
                this.closeOrder(o.id, newPrice, 'lost')
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
        order.active = false;

        const boughtInUSD = order.qty * order.entryPrice;
        const soldInUSD = order.qty * price;
        const gainInUSD = soldInUSD - boughtInUSD;

        order.closePrice = price;
        order.gain = gainInUSD;
        order.result = result;
        
        if ( (result === 'lost') && (order.type === 'buy')) {
            let z = (order.maxPriceReached - order.entryPrice);
            let target = (order.takeProfit - order.entryPrice);
            let coef = toFixedNumber( (z / target) * 100, 2);
            order.reachedPercent = coef;
        }
        else {
            order.reachedPercent = 100;
        }

    }

    toJSON() {
        return this.orders;
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

