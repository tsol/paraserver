
const { Spot } = require('@binance/connector')
const Candle = require('../../types/Candle.js');

/*
  [
    1499040000000,      // Open time
    "0.01634790",       // Open
    "0.80000000",       // High
    "0.01575800",       // Low
    "0.01577100",       // Close
    "148976.11427815",  // Volume
    1499644799999,      // Close time
    "2434.19055334",    // Quote asset volume
    308,                // Number of trades
    "1756.87402397",    // Taker buy base asset volume
    "28.46694368",      // Taker buy quote asset volume
    "17928899.62484339" // Ignore.
  ]
*/

function parseCandleFromREST(inCandleData) {

    const closeTime = inCandleData[6];

    return new Candle({
      openTime: inCandleData[0],
      open:     parseFloat(inCandleData[1]),
      high:     parseFloat(inCandleData[2]),
      low:      parseFloat(inCandleData[3]),
      close:    parseFloat(inCandleData[4]),
      volume:   parseFloat(inCandleData[5]),
      closeTime:   parseFloat(inCandleData[6]),
      live: false
    });
}

/* WSS STREAM: {
  "e": "kline",     // Event type
  "E": 123456789,   // Event time
  "s": "BNBBTC",    // Symbol
  "k": {
    "t": 123400000, // Kline start time
    "T": 123460000, // Kline close time
    "s": "BNBBTC",  // Symbol
    "i": "1m",      // Interval
    "f": 100,       // First trade ID
    "L": 200,       // Last trade ID
    "o": "0.0010",  // Open price
    "c": "0.0020",  // Close price
    "h": "0.0025",  // High price
    "l": "0.0015",  // Low price
    "v": "1000",    // Base asset volume
    "n": 100,       // Number of trades
    "x": false,     // Is this kline closed?
    "q": "1.0000",  // Quote asset volume
    "V": "500",     // Taker buy base asset volume
    "Q": "0.500",   // Taker buy quote asset volume
    "B": "123456"   // Ignore
  }
}*/

function parseCandleFromWSS(msg)
{
    if (msg['e'] !== 'kline') {
        console.log('BINANCE: parse_wss not a kline!');
        console.log(msg);
        return undefined;
    }

    const cdl = msg['k'];
    
    if (! cdl.x ) {
        return undefined;
    }

    return new Candle({
        openTime: cdl.t,
        open:     parseFloat(cdl.o),
        high:     parseFloat(cdl.h),
        low:      parseFloat(cdl.l),
        close:    parseFloat(cdl.c),
        volume:   parseFloat(cdl.v),
        closeTime: cdl.T,
        live: false
      });
  
}

class Stream {

    constructor(client, symbol, timeframe, limit, tickerProcessor) {

        this.wasFirstLiveData = false;

        this.client = client;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.limit = limit;
        this.tickerProcessor = tickerProcessor;    
        this.websocket = undefined;

        this.wsHandleOpen = this.wsHandleOpen.bind(this);
        this.wsHandleClose = this.wsHandleClose.bind(this);
        this.wsHandleData = this.wsHandleData.bind(this);

        this.startWebsocket();
        
    }

    loadHistoryData()
    {
        this.client.klines(this.symbol, this.timeframe, { limit: this.limit }).then(
            response => {
                console.log('BINANCE: history data loaded');
                let data = response.data;
                data.pop(); /* remove last element because its not closed candle */
                data.forEach( oneCandle => {
                    let objectCandle = parseCandleFromREST(oneCandle);
                    this.tickerProcessor.addCandle(objectCandle);    
                });

                this.tickerProcessor.batchLoadFinished();
                console.log('BINANCE: batch loaded. now we are live..');
            }
            )
            .catch( (error) => {
                console.log(error.message);
                process.exit(1)
            })

    }

    startWebsocket()
    {
        this.websocket = this.client.klineWS(this.symbol, this.timeframe, {
            open: this.wsHandleOpen,
            close: this.wsHandleClose,
            message: this.wsHandleData
        })
        
        //setTimeout(() => this.client.unsubscribe(this.websocket), 30000);
    }

    getId() {
        return this.symbol+'-'+this.timeframe;
    }

    wsHandleOpen() {
        console.log('BINANCE: ws stream open');
    }

    wsHandleClose() {
        console.log('BINANCE: ws stream close');
        this.wasFirstLiveData = false;
        this.tickerProcessor.reset();
    }

    wsHandleData(data) {
        console.log('BINANCE: ws stream data')
        let objectCandle = parseCandleFromWSS(JSON.parse(data));
        if (objectCandle) {
            this.tickerProcessor.addCandle(objectCandle);        
        }
        if (! this.wasFirstLiveData) { /* load history when WSS is 100% setup */
            this.loadHistoryData();
            this.wasFirstLiveData = true;
        }
    }

}

/* PUBLIC IO */

class BrokerBinance {

    constructor ({ apiKey, secretKey }, dataProcessor)
    {
        this.client = new Spot( apiKey, secretKey );
        this.dataProcessor = dataProcessor;
        this.streams = {};
        
        this.accountInfo = undefined;
        this.openOrders = [];

    }

    startTracking(symbol, timeframe, limit)
    {
        const tickerProcessor = this.dataProcessor.addTicker(symbol,timeframe, limit);
        const stream = new Stream(this.client, symbol, timeframe, limit, tickerProcessor);
        const sId = stream.getId();
        console.log('BINANCE_BROKER: added new stream: '+sId);
        this.streams[sId] = stream;
    }

    getAccountInfo() { return this.accountInfo; }
    getOpenOrders() { return this.openOrders; }

    updateAccountInfo()
    {
        this.client.account()
            .then(response => this.accountInfo = response.data )
            .catch(error => { throw new Error(error) } )
    } 

    async updateOpenOrders() {
        const openOrdersResponse = await this.client.openOrders();
        this.openOrders = openOrdersResponse.data;

        for (var order of this.openOrders) {
            let response = await this.client.myTrades(order.symbol);
            order.myTrades = response.data; 
        }
        return Promise.resolve(1);
    }


    


 /*
    sendRawCoinInfo(socket) {
        this.client.coinInfo()
            .then(response => socket.emit('broker_coin_info', response.data) )
            .catch(error => socket.emit('error', error ) )
    }
   
    sendAllOrders(socket, symbol) {

        this.client.allOrders(symbol)
            .then(response => socket.emit(
                'broker_all_orders', { symbol: symbol, data: response.data } ))
            .catch(error => socket.emit('error', error ))
    }
*/

}

module.exports = BrokerBinance;