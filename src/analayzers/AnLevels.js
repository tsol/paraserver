/*
** areas of value
**
**
*/

const AnalayzerIO = require("./AnalayzerIO");
const CDB = require('../types/CandleDebug');

class AnLevels extends AnalayzerIO {

        constructor() {
            super();
            this.valueAreas = [];
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags)
            CDB.setSource('levels');
            
            this.acquireValueCandles(flags);

            this.checkCandleTouch(candle);

        }

        checkCandleTouch(candle) {

        }


        /* searching for flags from HLTrend analyzer about highs and lows */
        acquireValueCandles(flags)
        {
            let candle;
            if ( candle = flags['hl_trend.new.high'] ) {
                this.addBounceLevel(false, candle);
            }

            if ( candle = flags['hl_trend.new.low'] ) {
                this.addBounceLevel(true, candle);
            }
            
        }

        addBounceLevel(bounceUp, candle) {
            let y0 = 0, y1 = 0;

            if (bounceUp) {
                y0 = candle.low;
                y1 = Math.min(candle.open, candle.close);
            }
            else {
                y0 = Math.max(candle.open, candle.close);
                y1 = candle.high;
            }
            let area = {
                y0: y0,
                y1: y1,     
                bounceUp: bounceUp,
                candle: candle
            };
            let color = ( bounceUp ? 'green' : 'yellow');
            this.valueAreas.push(area);
            CDB.horizontalBar(candle, y0, y1, { color: color, alpha: '0.1' } );
        }


}


module.exports = AnLevels;
