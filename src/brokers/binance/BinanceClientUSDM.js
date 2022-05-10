/*
** Binance Futures USD-M 'BrokerOrdersIO' client
**
**
*/

const { BrokerOrdersIO } = require('../BrokerIO.js');

const { USDMClient } = require('binance');
const { WebsocketClient } = require('binance');

const SETTINGS = require('../../../private/private.js');
const { RESULT } = require('../../types/Order.js');

class BinanceClientUSDM extends BrokerOrdersIO {

    constructor ({ apiKey, secretKey })
    {
        super();
        this.credentials = { api_key: apiKey, api_secret: secretKey };
        
        this.client = new USDMClient({
            ... this.credentials,
            ... {
                disableTimeSync: true,
                recvWindow: 30000
            }
        });

        this.eventProcessors = [];
        this.exchangeInfo = null;

    }

    async init()
    {
        await this.client.getExchangeInfo().then(result => {
            this.exchangeInfo = result;
        });

        this.wsClient = new WebsocketClient({
            ... this.credentials, 
            ... { beautify: true }
        });

        await this.wsClient.subscribeUsdFuturesUserDataStream();

        this.wsClient.on('message', (data) => {
            this.dispatchEvent(data);
        });

        if ( ! SETTINGS.dev ) {

            await this.periodicCleanup();

            var _self = this;
            setInterval(function () { _self.periodicCleanup() }, 5*60*1000);
        
        }

        return true;
    }


    getClient() {
        return this.client;
    }

    addEventProcessor(object)
    {
        this.eventProcessors.push(object);
    }

    dispatchEvent(data)
    {
        //console.log('raw message received ', JSON.stringify(data, null, 2));
        if ( data.e && data.e == "ORDER_TRADE_UPDATE") {
            if (data.o) {
                const id = data.o.i;
                if (data.o.X == "CANCELED") {
                    this.eventProcessors.forEach( (ep) => ep.onBrokerOrderCanceled(id) );
                } else 
                if (data.o.X == "FILLED") {
                    this.eventProcessors.forEach( (ep) => ep.onBrokerOrderFilled(id) );
                } 
            }
        }

        
        if ( data.e && data.e == "ACCOUNT_UPDATE") {

            const positions = [];

            for (var p of data.a.P) {
                positions.push({
                    symbol: p.s,
                    amount: p.pa,
                    pnl: p.up,
                    isLong: ( p.ps == 'LONG' ),
                    entryPrice: p.ep
                });
            }

            const pnl = positions.reduce( (sum, position) => sum + position.pnl, 0);
            const balance = data.a.B.find( wallet => wallet.a == 'USDT' ).wb;
            
            this.eventProcessors.forEach( (ep) => ep.onAccountUpdate(balance, pnl, positions) );
        }


    }

 
    getRAWSymbolInfo(symbol)
    {
        if (! this.exchangeInfo || ! this.exchangeInfo.symbols )
            { return null; }
        const info = this.exchangeInfo.symbols.find( (v) => v.symbol == symbol );
        return info;
    }

    getRAWSymbolFilter(symbolInfo,filterType,param) {
        let filter = symbolInfo.filters.find( (v) => v.filterType == filterType );
        if (! filter ) { return null; }
        return filter[param];
    }

    
    getSymbolInfo(symbol)
    {
        const info = this.getRAWSymbolInfo(symbol);
        if (! info) { throw new Error('BC-USDM: no exchangeInfo on '+symbol); }

        const qtyPrecision = info.quantityPrecision;
        const minQty = this.getRAWSymbolFilter(info,'MARKET_LOT_SIZE','minQty');
        const pricePrecision = info.pricePrecision;  
        const tickSize = this.getRAWSymbolFilter(info,'PRICE_FILTER','tickSize');

        if ( isNaN(qtyPrecision) || isNaN(pricePrecision) || ! minQty || ! tickSize) {
            throw new Error('BC-USDM: could not get symbol info');
        }

        return {
            qtyPrecision,
            pricePrecision,
            minQty,
            tickSize
        };

    }

   
    getAlignedOrderDetails(symbol,entryPrice,usdAmount,stopLoss,takeProfit)
    {
        const result = {
            quantity: 0,
            stopLoss: 0,
            takeProfit: 0
        };

        const info = this.getSymbolInfo(symbol);
        const quantity = (usdAmount / entryPrice).toFixed(info.qtyPrecision);
 
        if (quantity < info.minQty ) {
            throw Error('quantity problem: '+symbol+' q='+quantity+' < minq='+info.minQty);
        }

        result.quantity = Number(quantity);

        result.stopLoss = Number(stopLoss.toFixed(info.pricePrecision));
        result.takeProfit = Number(takeProfit.toFixed(info.pricePrecision));

        return result;
    } 


    async makeFullOrder(symbol,isLong,entryPrice,usdAmount,stopLoss,takeProfit)
    {
        const result = {
            quantity: 0,
            orders: {
                entry: { id: null },
                sl: { id: null },
                tp: { id: null}
            }
        };
        
        let mainSide = 'SELL';
        let stopSide = 'BUY';
        let positionSide = 'SHORT';

        if (isLong) {
            mainSide = 'BUY';
            stopSide = 'SELL';
            positionSide = 'LONG';
        }

        const info = this.getSymbolInfo(symbol);
        const quantity = Number((usdAmount / entryPrice).toFixed(info.qtyPrecision));
 
        if (quantity < info.minQty ) {
            throw Error('quantity problem: '+symbol+' q='+quantity+' < minq='+info.minQty);
        }

        result.quantity = quantity;

        const entryOrder = {
                symbol: symbol,
                side: mainSide,
                type: 'MARKET',
                positionSide: positionSide,
                quantity: quantity,
        };

        const slOrder = {
                symbol: symbol,
                side: stopSide,
                type: 'STOP_MARKET',
                positionSide: positionSide,
                closePosition: 'false',
                stopPrice: Number(stopLoss).toFixed(info.pricePrecision),                
                quantity: quantity        
        };

        const tpOrder = {
                symbol: symbol,
                side: stopSide,
                type: 'TAKE_PROFIT_MARKET',
                positionSide: positionSide,
                closePosition: 'false',
                stopPrice: Number(takeProfit).toFixed(info.pricePrecision),     
                quantity: quantity
        };
                
        // timeInForce: 'GTE_GTC';

        return this.client.submitNewOrder(entryOrder).then( (o) => {
            if ( o && o.orderId ) {
                result.orders.entry.id = o.orderId;
            }
            else { 
                error = 'entry: '+ ( o.msg ? o.msg : '' );
                throw new Error(error);
            }

            return this.client.submitNewOrder(slOrder).then( (o) => {
                if ( o && o.orderId ) {
                    result.orders.sl.id = o.orderId;
                }
                else { 
                    error = 'stop-loss: '+ ( o.msg ? o.msg : '' );
                    throw new Error(error);
                }

                return this.client.submitNewOrder(tpOrder).then( (o) => {
                    if ( o && o.orderId ) {
                        result.orders.tp.id = o.orderId;
                    }
                    else { 
                        error = 'take-profit: '+ ( o.msg ? o.msg : '' );
                        throw new Error(error);
                    }
                    return result;

                });

            });

        });

    }

    /*
    async makeFullOrder(symbol,isLong,entryPrice,usdAmount,stopLoss,takeProfit)
    {
        const result = {
            quantity: 0,
            orders: {
                entry: { id: null },
                sl: { id: null },
                tp: { id: null}
            }
        };
        
        let mainSide = 'SELL';
        let stopSide = 'BUY';
        let positionSide = 'SHORT';

        if (isLong) {
            mainSide = 'BUY';
            stopSide = 'SELL';
            positionSide = 'LONG';
        }

        const info = this.getSymbolInfo(symbol);
        if (! info) { throw new Error('BC-USDM: no exchangeInfo on '+symbol); }

        const qPrecision = info.quantityPrecision;
        const quantity = (usdAmount / entryPrice).toFixed(qPrecision);
        const minQty = this.getSymbolFilter(info,'MARKET_LOT_SIZE','minQty');
        const pricePrecision = info.pricePrecision;  

        if (quantity < minQty ) {
            throw Error('quantity problem: '+symbol+' q='+quantity+' < minq='+minQty);
        }

        result.quantity = quantity;

        let orders =
        [
            {
                symbol: symbol,
                side: mainSide,
                type: 'MARKET',
                positionSide: positionSide,
                quantity: quantity,
            },
            {
                symbol: symbol,
                side: stopSide,
                type: 'STOP_MARKET',
                positionSide: positionSide,
                closePosition: 'false',
                stopPrice: stopLoss.toFixed(pricePrecision),                
                quantity: quantity        
            },
            {
                symbol: symbol,
                side: stopSide,
                type: 'TAKE_PROFIT_MARKET',
                positionSide: positionSide,
                closePosition: 'false',
                stopPrice: takeProfit.toFixed(pricePrecision),
                quantity: quantity
            }
        ];

        
        let o = await this.client.submitMultipleOrders(orders);
        let error = null;

        if ( o[0] && o[0].orderId )
                { result.orders.entry.id = o[0].orderId }
        else    { error = 'entry: '+ ( o[0].msg ? o[0].msg : '' ); }

        if ( o[1] && o[1].orderId )
                { result.orders.sl.id = o[1].orderId; }
        else    { error = 'stop-loss: '+( o[1].msg ? o[1].msg : '' ); }

        if ( o[2] && o[2].orderId )
                { result.orders.tp.id = o[2].orderId; }
        else    { error = 'take-profit: '+( o[2].msg ? o[2].msg : '' ); }

        //console.log('RAW_REPLY submitMultiplyOrders:');
        //console.log(o);

        if (error) {
            const ids = getCreatedOrdersIds(result);
            if (ids.length > 0) { await this.closeOrderIds(symbol,ids); }
            throw new Error(error);
        }

        return result;
    }
    */

  
    async closeOrderIds(symbol, orderIdsArray) {
        
        //console.log('closeOrderIds '+symbol+':');
        //console.log(orderIdsArray);

        return this.client.cancelMultipleOrders({
            symbol: symbol,
            orderIdList: JSON.stringify(orderIdsArray)
        });
    };

    async closeOrderCLID(symbol, clientOrderId) {
        return this.client.cancelOrder({
            symbol: symbol,
            origClientOrderId: clientOrderId
        });
    };

    async moveStopLoss(symbol, orderId, newPrice){};
    async moveTakeProfit(symbol, orderId, newPrice){};

    async getAccountInformation() {

        const res = await this.client.getAccountInformation()
        .catch(err => {
          console.error("getAccountInfo error: ", err);
        });

        const balance = res.totalWalletBalance;
        const pnl = res.totalUnrealizedProfit;
        const positions = [];

        for (var p of res.positions) {

            if (Math.abs(Number(p.unrealizedProfit)) > 0) {
                positions.push({
                symbol: p.symbol,
                amount: p.positionAmt,
                pnl: p.unrealizedProfit,
                isLong: ( p.positionSide == 'LONG' ),
                entryPrice: p.entryPrice
                });
            }
        }

        return { balance, pnl, positions };

    };


    /*

    client.getBalance()
  .then(result => {
    console.log("getBalance result: ", result);
  })
  .catch(err => {
    console.error("getBalance error: ", err);
  });
  
6:{accountAlias: 'FzXqAusRfWFzTiXq', asset: 'USDT', balance: '23.29707870', crossWalletBalance: '23.29707870', crossUnPnl: '0.09475115', …}
accountAlias:'FzXqAusRfWFzTiXq'
asset:'USDT'
availableBalance:'21.99286741'
balance:'23.29707870'
crossUnPnl:'0.09475115'
crossWalletBalance:'23.29707870'
marginAvailable:true
maxWithdrawAmount:'21.99286741'
updateTime:1647991575371
    */

    async periodicCleanup()
    {
        try {

            const positions = await this.client.getPositions({});
            
            await this.killAstrayOrders(positions);
            await this.setAllIsolated(positions);
            
        }
        catch(err) {
            console.log('PERIODIC_CLEANUP: ERROR: '+err.message);
        }
    }

    async killAstrayOrders(positions)
    {
        let uniq = {};

        positions.forEach( (s) => {
            let amt = Number(s.positionAmt);
            if ( amt !== 0) { uniq[ s.symbol ] = 1; }
        });

        // let cnt = 1; for (var s in uniq) { console.log(cnt +': '+s); cnt++; }

        const orders = await this.client.getAllOpenOrders({});
                
        orders.forEach( (order) => {
            if (! uniq[ order.symbol ]) {
                let txtInfo = order.symbol+' id='+order.clientOrderId;
                console.log('KILL_ASTRAY_ORDER: [TRY] '+txtInfo);
                console.log(order);
                this.closeOrderCLID( order.symbol, order.clientOrderId ).then((res) => {
                    console.log('KILL_ASTRAY_ORDER: [DONE] '+txtInfo);
                    //console.log(res);
                })
                .catch( (err) => {
                    console.log('KILL_ASTRAY_ORDER: [ERROR] '+txtInfo+' '+err.message);
                })
            }
        })
            
            
    }


    async setAllIsolated(positions) {
    
        //console.log(res);
        let uniq = {};

        positions.forEach( (p) => {
            if (p.symbol.endsWith('USDT') && (p.marginType !== 'isolated'))
                { uniq[ p.symbol ] = 1; }
        })
  
        for (var s in uniq) {
          
            try {
                await this.client.setMarginType({ symbol: s, marginType: 'ISOLATED' });
                console.log ('SET_ISOLATED OK: '+s);
            }
            catch(err) {
                console.log ('SET_ISOLATED FAIL: '+s+' ('+err.message+')');
            }

        }
    
    }


}

function getCreatedOrdersIds(submitMultiplyOrdersResult) {
    const r = submitMultiplyOrdersResult.orders;
    let a = [];
    if (r.entry.id) { a.push(r.entry.id); }
    if (r.sl.id) { a.push(r.sl.id); }
    if (r.tp.id) { a.push(r.tp.id); }
    return a;
}

module.exports = BinanceClientUSDM;