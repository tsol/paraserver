/*
** Flag: btctrend - shows if bitcoin-usd 1 hour is above mac9 (uptrend or down)
**
** sets flag only on BTCUSDT-1h ticker, which can be addressed by 
** io.getTickerFlag('BTCUSDT-1h','btctrend')
**
*/

const Analyzer = require("../types/Analyzer");

const BTC = require("../../Orders/taggers/list_static/btc");

class BTCTREND extends Analyzer {

        static SYMBOL       = 'BTCUSDT';
        static TIMEFRAMES   = ['15m','1h','4h','1d'];
        static MA           = 'emac';
        static MA_PERIODS   = [9,20];

        constructor() {
            super();
            this.emas = [];
            BTCTREND.MA_PERIODS.forEach( p => {
                this.emas.push(BTCTREND.MA+p);
            });
        }

        init(io) {
            io.require('atr14');
            this.emas.forEach( ema => io.require(ema) );
        }

        getId() {
            return 'btctrend';
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);

            if (candle.symbol !== BTCTREND.SYMBOL) { return; }
            if (!BTCTREND.TIMEFRAMES.includes(candle.timeframe)) { return; }

            const atr14 = io.get('atr14');
            if (! atr14 ) { return; }
 
            
            BTCTREND.MA_PERIODS.forEach( p => {
                let ema = io.get(BTCTREND.MA+p);
               
                io.set('bt-'+candle.timeframe+'-'+p,
                    ( ema ? this.getTrend(candle,ema,atr14) : 0 )
                );
               
            });
         
        }

        getTrend(candle,ema,atr14) {

            let setTrend = 0;

            if (candle.close > ema) {
                setTrend = 1;
                if (candle.bodyLow() > ema) { 
                    setTrend = 2;
                    if (candle.low > ema) { 
                        setTrend = 3; 
                        if (candle.low > ema + atr14/2 ) { setTrend = 4; }
                    }
                }
            }
            else if (candle.close < ema) {
                setTrend = -1;
                if (candle.bodyHigh() < ema) { 
                    setTrend = -2;
                    if (candle.high < ema) { 
                        setTrend = -3; 
                        if (candle.high < ema - atr14/2 ) { setTrend = -4; }
                    }
                }
            }

            return setTrend;

        }


}

module.exports = BTCTREND;
