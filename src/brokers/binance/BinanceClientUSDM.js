
const { USDMClient } = require('binance');
const { BrokerOrdersIO } = require('../BrokerIO.js');

const BrokerOrder = require('../../types/BrokerOrder.js');
// const { TF } = require('../../types/Timeframes.js');

class BinanceClientUSDM extends BrokerOrdersIO {

    constructor ({ apiKey, secretKey })
    {
        super();
        this.client = new USDMClient({ api_key: apiKey, api_secret: secretKey });
        this.exchangeInfo = null;

    }

    async init()
    {
        await this.client.getExchangeInfo().then(result => {
            this.exchangeInfo = result;
        });
    }

    getSymbolInfo(symbol)
    {
        if (! this.exchangeInfo || ! this.exchangeInfo.symbols )
            { return null; }
        const info = this.exchangeInfo.symbols.find( (v) => v.symbol == symbol );
        return info;
    }
/*
    "pricePrecision": 5,    // please do not use it as tickSize
    "quantityPrecision": 0, // please do not use it as stepSize
    "baseAssetPrecision": 8,
    "quotePrecision": 8, 
*/
    getSymbolQuantityPrescision(symbol)
    {
        const info = this.getSymbolInfo(symbol);
        if (info) { return info.quantityPrecision }
        return null;
    }

    getSymbolMinimumQuantity(symbol) {
        const info = this.getSymbolInfo(symbol);
        if (!info) { return null; }

        let filter = info.filters.find( (v) => v.filterType == 'MARKET_LOT_SIZE' );
        if (! filter ) { return null; }

        return filter.minQty;
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

        const qPrescision = this.getSymbolQuantityPrescision(symbol) || 0;
        const quantity = (usdAmount / entryPrice).toFixed(qPrescision);
        const minQty = this.getSymbolMinimumQuantity(symbol);

        if (quantity <= minQty ) {
            throw new Error('Quantity problem: '+symbol+' q='+quantity+' < minq='+minQty);
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
                symbol: 'ATOMUSDT',
                side: stopSide,
                type: 'STOP_MARKET',
                positionSide: positionSide,
                closePosition: 'true',
                stopPrice: stopLoss.toFixed(3)
            },
            {
                symbol: 'ATOMUSDT',
                side: stopSide,
                type: 'TAKE_PROFIT_MARKET',
                positionSide: positionSide,
                closePosition: 'true',
                stopPrice: takeProfit.toFixed(3)
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

        console.log('RAW_REPLY submitMultiplyOrders:');
        console.log(o);

        if (error) {
            const ids = getCreatedOrdersIds(result);
            if (ids.length > 0) { await this.closeOrderIds(symbol,ids); }
            throw new Error(error);
        }

        return result;
    }
    

  
    async closeOrderIds(symbol, orderIdsArray) {
        
        console.log('closeOrderIds '+symbol+':');
        console.log(orderIdsArray);

        return await this.client.cancelMultipleOrders({
            symbol: symbol,
            orderIdList: JSON.stringify(orderIdsArray)
        });
    };

    async moveStopLoss(symbol, orderId, newPrice){};
    async moveTakeProfit(symbol, orderId, newPrice){};

    async getBalance() {};
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