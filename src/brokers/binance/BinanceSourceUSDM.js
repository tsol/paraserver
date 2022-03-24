const { CandleSourceIO } = require('../BrokerIO.js');
const Candle = require('../../types/Candle.js');
const { TF } = require('../../types/Timeframes.js');

const { USDMClient } = require('binance');
const { WebsocketClient } = require('binance');

class BinanceSourceUSDM extends CandleSourceIO {

    static MAX_CANDLES_PER_REQUEST = 1500;

    constructor ({ apiKey, secretKey })
    {
        super();
        this.client = new USDMClient({ api_key: apiKey, api_secret: secretKey });
        this.streams = {};

        this.wsClient = new WebsocketClient({
            api_key: apiKey,
            api_secret: secretKey,
            beautify: true,
        });

        this.wsClient.on('message', (data) => {
            this.dispatchWSData(data);
        });

    }

    hasSymbol(symbol) { return true; }

    // this function might return not yet closed candle
    async loadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp)
    {
        if (startTimestamp > endTimestamp) {
            throw new Error('BS-USDM: start greater than end!');
        }
        let allCandles = [];

        let currentStart = startTimestamp;
        
        while ( true ) {
            let candles = await this.tryLoadCandlesPeriod(
                symbol, timeframe, currentStart, endTimestamp
            );

            if (candles.length === 0) {
                break;
            }

            allCandles = [... allCandles, ... candles];
            let lastCandle = candles[ candles.length - 1];

            if (lastCandle.closeTime >= endTimestamp-1) {
                break;
            }

            currentStart = lastCandle.closeTime;

        }

        PIO.markUnclosedLastCandle(allCandles);

        return allCandles;
    }


    async tryLoadCandlesPeriod(symbol, timeframe, startTimestamp, endTimestamp)
    {

        console.log('BS-USDM: ('+symbol+'-'+timeframe
            +') TRY TO LOAD FROM '
            +TF.timestampToDate(startTimestamp));

       let data = await this.client.getKlines({
                symbol: symbol,
                interval: timeframe,
                limit: BinanceSourceUSDM.MAX_CANDLES_PER_REQUEST,
                startTime: startTimestamp,
                endTime: endTimestamp
        });
  

        if (! data ) { return []; }
        let candles = [];

        data.forEach( oneCandle => {
            let objectCandle = PIO.parseCandleFromREST(symbol,timeframe,oneCandle);
            candles.push(objectCandle);    
        });

        console.log('BS-USDM: ('+symbol+'-'+timeframe+') TRY LOADED '
                    +candles.length+' CANDLES.');
    
        return candles;
    }

    
    async loadLastCandles(symbol, timeframe, limit)
    {
       let data = await this.client.getKlines({
            symbol: symbol,
            interval: timeframe,
            limit: limit
        });

        if (! data ) { return []; }
        let candles = [];

        data.forEach( oneCandle => {
            let objectCandle = PIO.parseCandleFromREST(symbol,timeframe,oneCandle);;
            candles.push(objectCandle);    
        });

        PIO.markUnclosedLastCandle(candles);
        return candles;
    }


    subscribe(symbol, timeframe, subscriberId, subscriberObject)
    {
        const sid = symbol+'-'+timeframe;
        const foundStream = this.streams[sid];

        if (foundStream) {
            foundStream.subscribe(subscriberId,subscriberObject);
            return true;
        }

        const stream = new Stream(this.wsClient, symbol, timeframe);
        console.log('BS-USDM: added new stream: '+sid);
        this.streams[sid] = stream;
        stream.subscribe(subscriberId,subscriberObject);
        return true;
    }

    unsubscribe(symbol,timeframe,subscriberId)
    {
        const sid = symbol+'-'+timeframe;
        const foundStream = this.streams[sid];
        if (foundStream) {
            return foundStream.unsubscribe(subscriberId);
        }
        return false;
    }

    

    dispatchWSData(data) {

        // JSON.parse(data) ?
        //console.log('BS-USDM: dispatch websocket data:');
        //console.log(data);

        if (! data || data.e !== 'continuous_kline' ) { return; }
        const symbol = data.ps;
        const timeframe = data.k.i;

        const sid = symbol+'-'+timeframe;
        const foundStream = this.streams[sid];
        
        if (! foundStream) {
            throw new Error("BS-USDM: socket dispatch no stream exist: "+sid);
        }
        
        foundStream.handleData(data);
    }
/*
{
  "e":"continuous_kline",   // Event type
  "E":1607443058651,        // Event time
  "ps":"BTCUSDT",           // Pair
  "ct":"PERPETUAL"          // Contract type
  "k":{
    "t":1607443020000,      // Kline start time
    "T":1607443079999,      // Kline close time
    "i":"1m",               // Interval
    "f":116467658886,       // First trade ID
    "L":116468012423,       // Last trade ID
    "o":"18787.00",         // Open price
    "c":"18804.04",         // Close price
    "h":"18804.04",         // High price
    "l":"18786.54",         // Low price
    "v":"197.664",          // volume
    "n": 543,               // Number of trades
    "x":false,              // Is this kline closed?
    "q":"3715253.19494",    // Quote asset volume
    "V":"184.769",          // Taker buy volume
    "Q":"3472925.84746",    //Taker buy quote asset volume
    "B":"0"                 // Ignore
  }
}
*/

}

class PIO // private IO
{

    static markUnclosedLastCandle(candles)
    {
        if (candles.length === 0) return false;

        let lastCandle = candles[candles.length-1];
               
        if ( TF.checkCandleCloseTimeInFuture(lastCandle)) {
            console.log('BINANCE_SRC: close in future, marking unclosed '
            +lastCandle.symbol+'-'+lastCandle.timeframe+' close:'
            +TF.timestampToDate(lastCandle.closeTime));
            lastCandle.closed = false;
            return true;                    
        }
        
        return false;
    }

    static parseCandleFromREST(symbol,timeframe,inCandleData) {
    return new Candle({
      openTime: inCandleData[0],
      open:     parseFloat(inCandleData[1]),
      high:     parseFloat(inCandleData[2]),
      low:      parseFloat(inCandleData[3]),
      close:    parseFloat(inCandleData[4]),
      volume:   parseFloat(inCandleData[5]),
      closeTime:   parseFloat(inCandleData[6]),
      live: false,
      closed: true,
      symbol: symbol,
      timeframe: timeframe
    });
    }

    static parseCandleFromWSS(symbol,timeframe,msg)
    {
        const cdl = msg['k'];
    
        return new Candle({
        openTime: cdl.t,
        open:     parseFloat(cdl.o),
        high:     parseFloat(cdl.h),
        low:      parseFloat(cdl.l),
        close:    parseFloat(cdl.c),
        volume:   parseFloat(cdl.v),
        closeTime: cdl.T,
        live: true,
        closed: ( cdl.x ? true : false),
        symbol: symbol,
        timeframe: timeframe
      });
  
    }
}

class Stream {


/*
    public subscribeContinuousContractKlines(symbol: string, contractType: 'perpetual' | 'current_quarter' | 'next_quarter', interval: KlineInterval, market: 'usdm' | 'coinm', forceNewConnection?: boolean): WebSocket {
        const lowerCaseSymbol = symbol.toLowerCase();
        const streamName = 'continuousKline';
        const wsKey = getWsKeyWithContext(market, streamName, lowerCaseSymbol, interval);
        return this.connectToWsUrl(this.getWsBaseUrl(market, wsKey) + `/ws/${lowerCaseSymbol}_${contractType}@${streamName}_${interval}`, wsKey, forceNewConnection);
      }
*/

    constructor(wsClient, symbol, timeframe) {

        this.wsClient = wsClient;
        this.symbol = symbol;
        this.timeframe = timeframe;
     
        this.subscribers = [];
        this.wsClient.subscribeContinuousContractKlines(
                symbol, 'perpetual', timeframe, 'usdm', false);
        
    }

    handleData(data) {
        let objectCandle = PIO.parseCandleFromWSS(this.symbol,this.timeframe,data);
        if (objectCandle) {
            this.subscribers.forEach( s => s.obj.newCandleFromBroker(objectCandle) );
        }
    }

    subscribe(subscriberId, subscriberObject)
    {
        const found = this.subscribers.find( s => s.id === subscriberId );
        if (found) { found.obj = subscriberObject; return true; }
        this.subscribers.push({ id: subscriberId, obj: subscriberObject });
        return true;
    }

    unsubscribe(id)
    {
        this.subscribers = this.subscribers.filter( s => s.id !== id );
    }

    getId() {
        return this.symbol+'-'+this.timeframe;
    }



}



module.exports = BinanceSourceUSDM;