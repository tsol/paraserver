
const { Spot } = require('@binance/connector')
const Candle = require('../../types/Candle.js');

function parseCandleFromREST(symbol,timeframe,inCandleData) {
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

function parseCandleFromWSS(symbol,timeframe,msg)
{
    if (msg['e'] !== 'kline') {
        console.log('BINANCE_SRC: parse_wss not a kline!');
        console.log(msg);
        return undefined;
    }

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

class Stream {

    constructor(client, symbol, timeframe) {

        this.client = client;
        this.symbol = symbol;
        this.timeframe = timeframe;
      this.websocket = undefined;

        this.subscribers = [];

        this.wsHandleOpen = this.wsHandleOpen.bind(this);
        this.wsHandleClose = this.wsHandleClose.bind(this);
        this.wsHandleData = this.wsHandleData.bind(this);

        this.startWebsocket();
        
    }

    subscribe(subscriberId, subscriberObject)
    {
        const found = this.subscribers.find( s => s.id === subscriberId );
        
        if (found) {
            found.obj = subscriberObject;
            return true;
        }

        this.subscribers.push({
                id: subscriberId,
                obj: subscriberObject
        });

        return true;
    }

    unsubscribe(id)
    {
        this.subscribers = this.subscribers.filter( s => s.id !== id );
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
        console.log('BINANCE_SRC: ws stream open');
    }

    wsHandleClose() {
        console.log('BINANCE_SRC: ws stream close');
        // todo: tell symbolProcessor, or reconnect ?
    }

    wsHandleData(data) {
        let objectCandle = parseCandleFromWSS(this.symbol,this.timeframe,JSON.parse(data));
        if (objectCandle) {
            this.subscribers.forEach( s => s.obj.newCandleFromBroker(objectCandle) );
        }
    }

}

/* PUBLIC IO */

class BinanceSource {

    constructor ({ apiKey, secretKey })
    {
        this.client = new Spot( apiKey, secretKey );
        this.streams = {};
    }

    async loadCandles(symbol, timeframe, limit)
    {
       let candles = await this.client.klines(symbol, timeframe, { limit: limit })
            .then( response => {
                let candles = [];

                response.data.forEach( oneCandle => {
                    let objectCandle = parseCandleFromREST(symbol,timeframe,oneCandle);;
                    candles.push(objectCandle);    
                });

                /* last candle is most likely not closed */
                candles[candles.length-1].closed = false;

                return candles;
            })
            .catch( (error) => {
                console.log(error.message);
                process.exit(1)
            })


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

        const stream = new Stream(this.client, symbol, timeframe);
        console.log('BINANCE_SRC: added new stream: '+sid);
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


}

module.exports = BinanceSource;