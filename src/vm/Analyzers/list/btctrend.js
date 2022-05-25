/*
** Flag: btctrend - shows if bitcoin-usd 1 hour is above mac9 (uptrend or down)
**
** sets flag only on BTCUSDT-1h ticker, which can be addressed by 
** io.getTickerFlag('BTCUSDT-1h','btctrend')
**
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');

class AnBTCTrend extends Analyzer {

        constructor() {
            super();
        }

        init(io) {
            io.require('atr14');
            io.require('mac9');
        }

        getId() {
            return 'btctrend';
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);

            if (io.getFlags().currentId() !== 'BTCUSDT-1h') { 
                // propogandate flag to every ticker flag space:
                //const btcflag = io.getTickerFlag('BTCUSDT-1h','btctrend');
                //if (btcflag) { io.set('btctrend',btcflag); }
                return;
            }

            const mac9 = io.get('mac9');
            const atr14 = io.get('atr14');

            if (! mac9 || ! atr14 ) { return; }
                
            let setTrend = 0;

            if (candle.close > mac9) {
                setTrend = 1;
                if (candle.bodyLow() > mac9) { 
                    setTrend = 2;
                    if (candle.low > mac9) { 
                        setTrend = 3; 
                        if (candle.low > mac9 + atr14/2 ) { setTrend = 4; }
                    }
                }
            }
            else if (candle.close < mac9) {
                setTrend = -1;
                if (candle.bodyHigh() < mac9) { 
                    setTrend = -2;
                    if (candle.high < mac9) { 
                        setTrend = -3; 
                        if (candle.high < mac9 - atr14/2 ) { setTrend = -4; }
                    }
                }
            }

            io.set('btctrend',setTrend);

        }

}

module.exports = AnBTCTrend;
