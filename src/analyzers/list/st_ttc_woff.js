/*
** The Trading Channel "Wick Off MA20" (https://youtu.be/hEUALimWs7E, Timing: 27:50)
**
** Strategy: 38.2 candle (hammer) wick off MA20
** Depends on: mac20, atr14, cdlpatts
**

TODO:

Replace with EMA
Stop: 20 pips if ATR < 100 (below the low of the candle)
Stop: 50 pips if ATR > 100
DO not trade candles > 2xATR
DO not trade candles > 300 pips 

*/

const Strategy = require("../types/Strategy");
const CDB = require('../../types/CandleDebug');

class TTCWOFF extends Strategy {

        static MIN_LENGTH = 2; /* minumum candles to close above ma20 */

        constructor() {
            super();
            this.aboveCnt = 0;
            this.belowCnt = 0;
        }

        getId() { return 'ttcwoff'; }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const atr = flags.get('atr14');
            const ma = flags.get('emac20');

            if (! ma || ! atr ) { return false; }

            if (candle.low > ma)
                { return this.aboveCnt++; }

            if (candle.high < ma)
                { return this.belowCnt++; }
 
            const pip = flags.get('helper').getSymbolInfo(candle.symbol).tickSize; 

            //console.log('PIP: '+candle.symbol+' '+pip);

            const tooBig = (candle.bodySize() > 2 * atr) || (candle.bodySize() > 300 * pip);
            
            if (candle.low <= ma) {

                if ( (candle.bodyLow() > ma) && (this.aboveCnt >= TTCWOFF.MIN_LENGTH))
                {
                    if (!tooBig && flags.get('cdlpatts.new.ham')) {
                        this.makeEntry(true,candle,flags);
                    }
                }

                this.aboveCnt = 0;
            }


            if (candle.high >= ma) {

                if ( (candle.bodyHigh() < ma) && (this.belowCnt >= TTCWOFF.MIN_LENGTH))
                {
                    if (!tooBig && flags.get('cdlpatts.new.shu')) {
                        this.makeEntry(false,candle,flags);   
                    }
                }

                this.belowCnt = 0;
            }
 
        }


        makeEntry(isBuy,candle,flags) {
            const io = flags.get('helper');
            const pip = io.getSymbolInfo(candle.symbol).tickSize; 
            const atr = flags.get('atr14');
            
            let slMargin = pip *
                    ( atr > 100 ? 50 : 20 );
            
            //if (slMargin > atr*0.5) { slMargin = 0.5*atr; };
            //if (slMargin < atr*0.1) { slMargin = 0.1*atr; }

            //slMargin = atr;
            //if (slMargin > atr ) { slMargin = atr; }

            let stopLoss = ( isBuy ? candle.low-slMargin : candle.high+slMargin );

            io.makeEntry(this, ( isBuy ? 'buy' : 'sell'), { 
                rrRatio: 1,
                stopLoss: stopLoss 
            }); 
        }
    
}

module.exports = TTCWOFF;
