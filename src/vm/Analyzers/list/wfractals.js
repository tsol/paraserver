/*
** Williams Fractals
**

Bearish Fractal= 
    High(N)>High(N−2) and
    High(N)>High(N−1) and
    High(N)>High(N+1) and
    High(N)>High(N+2)
​
Bullish Fractal= 
    Low(N)<Low(N−2) and
    Low(N)<Low(N−1) and
    Low(N)<Low(N+1) and
    Low(N)<Low(N+2)
​
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');

class AnWFractals extends Analyzer {

        constructor(period) {
            super();
            this.name = 'wfractals';
            this.candles = [];
        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            this.candles.push(candle);

            if (this.candles.length < 5) { return; }
            if (this.candles.length > 5) { this.candles.shift(); }

            const c = this.candles;
            const mc = c[2];
            const h = mc.high;
            const l = mc.low;
            
            if ( 
                    (h > c[0].high)
                &&  (h > c[1].high)
                &&  (h > c[3].high)
                &&  (h > c[4].high)
            ) {
                flags.set('wfractals',{ type: 'high', candle: mc } );
                CDB.labelTop(mc, '^');
            }

            if ( 
                    (l < c[0].low)
                &&  (l < c[1].low)
                &&  (l < c[3].low)
                &&  (l < c[4].low)
            ) {
                flags.set('wfractals',{ type: 'low', candle: mc } );
                CDB.labelBottom(mc, 'v');
            }

        }

}

module.exports = AnWFractals;
