
const { USDMClient } = require('binance');
const { BrokerOrdersIO } = require('../BrokerIO.js');

const BrokerOrder = require('../../types/BrokerOrder.js');
// const { TF } = require('../../types/Timeframes.js');

const { WebsocketClient } = require('binance');


class BinanceClientUSDM extends BrokerOrdersIO {

    constructor ({ apiKey, secretKey })
    {
        super();
        this.client = new USDMClient({ api_key: apiKey, api_secret: secretKey });
        this.eventProcessors = [];

        this.exchangeInfo = null;

        this.wsClient = new WebsocketClient({
            api_key: apiKey,
            api_secret: secretKey,
            beautify: true,
            // Disable ping/pong ws heartbeat mechanism (not recommended)
            // disableHeartbeat: true
        });

        this.wsClient.subscribeUsdFuturesUserDataStream();

        this.wsClient.on('message', (data) => {
            this.dispatchEvent(data);
        });
/*
        {
            "e": "ORDER_TRADE_UPDATE",
            "T": 1648051860903,
            "E": 1648051860910,
            "o": {
              "s": "FILUSDT",
              "c": "x-15PC4ZJyCALO0RqYJ1VSz1xXFQ-9erZsL",
              "S": "SELL",
              "o": "TAKE_PROFIT_MARKET",
              "f": "GTC",
              "q": "0",
              "p": "0",
              "ap": "0",
              "sp": "19.595",
              "x": "CANCELED",
              "X": "CANCELED",
              "i": 16909129428,
              "l": "0",
              "z": "0",
              "L": "0",
              "T": 1648051860903,
              "t": 0,
              "b": "0",
              "a": "0",
              "m": false,
              "R": true,
              "wt": "CONTRACT_PRICE",
              "ot": "TAKE_PROFIT_MARKET",
              "ps": "LONG",
              "cp": true,
              "rp": "0",
              "pP": false,
              "si": 0,
              "ss": 0
            },
            "wsMarket": "usdm",
            "wsKey": "usdm_userData_smPrVtsn5J66T4msrkKtbUsSbl9iJypPAj5Cb7LvbIZN0bYPArWRNbQ0zoDUf05l"
          }
*/

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

    getSymbolFilter(symbolInfo,filterType,param) {
        let filter = symbolInfo.filters.find( (v) => v.filterType == filterType );
        if (! filter ) { return null; }
        return filter[param];
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

/*
    "pricePrecision": 5,    // please do not use it as tickSize
    "quantityPrecision": 0, // please do not use it as stepSize
    "baseAssetPrecision": 8,
    "quotePrecision": 8, 
*/
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
                closePosition: 'true',
                stopPrice: stopLoss.toFixed(pricePrecision)
            },
            {
                symbol: symbol,
                side: stopSide,
                type: 'TAKE_PROFIT_MARKET',
                positionSide: positionSide,
                closePosition: 'true',
                stopPrice: takeProfit.toFixed(pricePrecision)
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
    

  
    async closeOrderIds(symbol, orderIdsArray) {
        
        //console.log('closeOrderIds '+symbol+':');
        //console.log(orderIdsArray);

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