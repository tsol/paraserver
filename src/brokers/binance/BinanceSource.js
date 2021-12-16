
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

    return new Candle({
        openTime: cdl.t,
        open:     parseFloat(cdl.o),
        high:     parseFloat(cdl.h),
        low:      parseFloat(cdl.l),
        close:    parseFloat(cdl.c),
        volume:   parseFloat(cdl.v),
        closeTime: cdl.T,
        live: true,
        closed: ( msg[k] ? true : false),
        symbol: symbol,
        timeframe: timeframe
      });
  
}

class Stream {

    constructor(client, symbol, timeframe, symbolProcessor) {

        this.client = client;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.symbolProcessor = symbolProcessor;    
        this.websocket = undefined;

        this.wsHandleOpen = this.wsHandleOpen.bind(this);
        this.wsHandleClose = this.wsHandleClose.bind(this);
        this.wsHandleData = this.wsHandleData.bind(this);

        this.startWebsocket();
        
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
            this.symbolProcessor.newCandleFromBroker(objectCandle);
        }
    }

}

/* PUBLIC IO */

class BinanceSource {

    constructor ({ apiKey, secretKey })
    {
        this.client = new Spot( apiKey, secretKey );
        this.dataProcessor = dataProcessor;
        this.streams = {};
    }

    async loadCandles(symbol, timeframe, limit)
    {
        this.client.klines(symbol, timeframe, { limit: limit })
            .then( response => {
                let candles = [];

                response.data.forEach( oneCandle => {
                    let objectCandle = parseCandleFromREST(this.symbol,this.timeframe,oneCandle);;
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

    }


    subscribe(symbol, timeframe, symbolProcessor)
    {
        const stream = new Stream(this.client, symbol, timeframe, symbolProcessor);
        const sId = stream.getId();
        console.log('BINANCE_SRC: added new stream: '+sId);
        this.streams[sId] = stream;
    }

 
}

module.exports = BinanceSource;