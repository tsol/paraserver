/*
    In future this should  be subscription dispatcher

*/

const CDB = require('../types/CandleDebug');

class OrdersManager {

    constructor() {
        this.orders = [];
    }

    newEntry(entry, isLive) {

        if (entry.type === 'buy') {
            if (   ! entry.atCandle 
                || ! entry.strategy
                || ! entry.takeProfit
                || ! entry.stopLoss
            ) {
                console.log(entry);
                throw new Error('bad newOrder entry!');
            }

            if (entry.atCandle.timeframe in['1d']) {
                console.log('OM: ignoring order entry for timeframe='+
                    entry.atCandle.timeframe);
            }

            return this.newOrderBuy(
                entry.atCandle, entry.strategy, entry.takeProfit, entry.stopLoss, entry.flags
            );
        }

        return undefined;
    }

/*
                id: 'BNCUSDT-1m-dbltop',
                time: 1678232323,
                symbol: 'BNCUSDT',
                timeframe: '1m',
                strategy: 'dbltop',
                type: 'buy',
                entryPrice: 52.234,
                takeProfit: 52.522,
                stopLoss: 52.102	
*/

    newOrderBuy(atCandle,strategyName,takeProfit,stopLoss, flags) {

        const tickerId = atCandle.symbol+'-'+atCandle.timeframe;
        const time = atCandle.closeTime;
        const orderId = tickerId+'-'+strategyName+'-'+time;
        
        const order = {
            id: orderId,
            time: time,
            type: 'buy',
            symbol: atCandle.symbol,
            timeframe: atCandle.timeframe,
            strategy: strategyName,
            entryPrice: atCandle.close,
            takeProfit: takeProfit,
            stopLoss: stopLoss,

            flags: flags,

            active: true,
            closePrice: 0,
            gain: 0
        }

        order.qty = this.riskManageGetQty(order);
    
        this.orders.push(order);

        console.log('OM: new order BUY '+orderId);
        CDB.entry(atCandle,takeProfit,stopLoss);

        return orderId;
    }

    riskManageGetQty(order) {
        const inUSD = 100;
        const priceInUSD = order.entryPrice;
        const qty = inUSD / priceInUSD;
        return qty;
    }

    lowestPriceOnClose(symbol, timeframe, newPrice, isLive) {
        this.priceUpdated(symbol, timeframe, newPrice, isLive);
    }

    highestPriceOnClose(symbol, timeframe, newPrice, isLive) {
        this.priceUpdated(symbol, timeframe, newPrice, isLive);
    }

    priceUpdated(symbol, timeframe, newPrice, isLive) {
        //console.log('OM: price update '+symbol+' = '+newPrice);

        const orders = this.orders.filter( o => 
            o.active && (o.symbol === symbol) && (o.timeframe === timeframe) );

        orders.filter( o => newPrice >= o.takeProfit ).forEach( o => this.closeOrder(o.id, newPrice) );
        orders.filter( o => newPrice <= o.stopLoss ).forEach( o => this.closeOrder(o.id, newPrice) );

    }

    closeOrder(orderId,price) {
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
    }

    toJSON() {
        return this.orders;
    }

}

module.exports = OrdersManager;

