/*
** Gerchik of level trading (BSU, BPU1, BPU2, TVH)
**

**
*/

const Strategy = require("../types/Strategy");
const CDB = require('../../../types/CandleDebug');

class GEROFLVL extends Strategy {

        static STOP_SIZE_ATR    = 0.125;  // stopSize = 10-15% of ATR 
        static LUFT             = 0.2;  // LUFT is 20% of stopSize
        static RR_RATIO         = 3;    // takeProfit = 3 * stopSize
        static MATCH_CANDLES    = 1;

        constructor() {
            super();
            this.resetFinder();
        }

        resetFinder() {
            this.foundLevel = null;
            this.direction = 0;
            this.weight = 0;
        }

        getId() { return 'geroflvl'; }

        init(io) {
            io.require('atr14');
            io.require('vlevels');
            io.require('prices');
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            CDB.setSource(this.getId());

            const atr = io.get('atr14');
            if (! atr ) { return false; }


            if (this.foundLevel) { // BPU1 is found, entry on current candle

                const stopSize = atr * GEROFLVL.STOP_SIZE_ATR;
                const luft = stopSize * GEROFLVL.LUFT;
                const entry = candle.close;
                const buy = this.direction > 0;
                
                if ( 
                        (Math.abs(this.foundLevel - entry) > luft)
                    ||  ( buy && (candle.low < this.foundLevel) )
                    ||  ( !buy && (candle.high > this.foundLevel) )
                ) {
                    this.resetFinder();
                    CDB.labelBottom(candle,'xOL'); // out of luft
                    return;
                }

                const stopLoss = entry - this.direction * stopSize;

                io.makeEntry(this, ( this.direction > 0 ? 'buy' : 'sell'), { 
                    rrRatio: GEROFLVL.RR_RATIO,
                    stopLoss: stopLoss 
                }); 

                this.resetFinder();

            }

            // try to find BPU1

            const vlevels = io.get('vlevels');
            const vlevels_high = io.get('vlevels_high');

            if (! vlevels || ! vlevels_high ) {
                return false;
            }
        
            const prices = io.get('prices');

            const ph = candle.high;
            const pl = candle.low;
            let weight = 10;
            let mp = null;

            if (prices.findPrice(ph).times >= GEROFLVL.MATCH_CANDLES) {
    
                let wh = vlevels_high.getTopTouchWeights(candle,null);
                let w = vlevels.getTopTouchWeights(candle,null)
                let tw = w.rw + w.sw + wh.rw + wh.sw;

                if (tw > 0) {
                    mp = ph;
                }
            
            }
            
            if (prices.findPrice(pl).times >= GEROFLVL.MATCH_CANDLES) { 
                
                let wh = vlevels_high.getBottomTouchWeights(candle);
                let w = vlevels.getBottomTouchWeights(candle)
                let tw = w.rw + w.sw + wh.rw + wh.sw;

                if (tw > 0) {
                    mp = pl;
                }

            }
            

            /*
    
            let mp = vlevels_high.exactPriceMatch([ph,pl]);
            if (! mp) {
                weight = 5;
                mp = vlevels.exactPriceMatch([ph,pl]);
            }
            */


            if (! mp ) {        // didnt found enything
                return false;
            }
            
            //console.log('GER: found exact! '+candle.symbol);

            this.foundLevel = mp;
            this.direction = ( mp == pl ? 1 : -1 );
            this.weight = weight;

            CDB.labelBottom(candle,'B'+ (this.direction>0?'U':'D'));


        }


    
}

module.exports = GEROFLVL;
