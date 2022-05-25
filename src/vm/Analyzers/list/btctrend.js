/*
** Flag: btctrend - shows if bitcoin-usd 1 hour is above mac9 (uptrend or down)
**
** sets flag only on BTCUSDT-1h ticker, which can be addressed by 
** flags.getTickerFlag('BTCUSDT-1h','btctrend')
**
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');

class AnBTCTrend extends Analyzer {

        constructor() {
            super();
        }

        getId() {
            return 'btctrend';
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);

            if (flags.currentId() !== 'BTCUSDT-1h') { 
                // propogandate flag to every ticker flag space:
                //const btcflag = flags.getTickerFlag('BTCUSDT-1h','btctrend');
                //if (btcflag) { flags.set('btctrend',btcflag); }
                return;
            }

            const mac9 = flags.get('mac9');
            const atr14 = flags.get('atr14');

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

            flags.set('btctrend',setTrend);

        }

}

module.exports = AnBTCTrend;
