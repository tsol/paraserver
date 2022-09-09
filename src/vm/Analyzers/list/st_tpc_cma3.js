/*
**  Trade Pro Channel - Strategy Moving Avarage cross 200 & 50
**  (https://www.youtube.com/watch?v=ohtnf4H_HMA)
**  
**
**  1. Look for EMA 50 cross up EMA 200
**  2. If 3 or more candles close below EMA 200 - skip
**  3. Wait for price to touch EMA 50
**  4. Wait for first green candle close above EMA 50
**  5. Enter with 2*ATR14 down and 1.5 ratio
**
*/

const Strategy = require("../types/Strategy");


class StrategyCrossMA3 extends Strategy {
  
        constructor(isLong) {
            super();
            this.isLong = isLong;
            this.name = 'cma3'+(isLong?'buy':'sell');
            this.prevFiftyAbove = undefined;
            this.resetFinder();
        }

        init(io) {
            io.require('emac50');
            io.require('emac200');
        }

        getId() { return this.name; }

        resetFinder() {
            this.wasCross = false;
            this.wasTouch = false;
            this.countCloseBelow200 = 0;
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());

            const mac50 = io.get('emac50');
            const mac200 = io.get('emac200');

            if (! mac50 || ! mac200 ) { return; }

            const fiftyAbove = ( this.isLong ? mac50 > mac200 : mac50 < mac200 );
                    
            if (! this.wasCross)
            {
                if (this.prevFiftyAbove === undefined) {
                    this.prevFiftyAbove = fiftyAbove;
                    return;
                }
                if (! this.prevFiftyAbove && fiftyAbove) {
                    this.wasCross = true;
                    io.cdb().labelTop(candle,'C');                
                }
                else {
                    this.prevFiftyAbove = fiftyAbove;
                    return;
                }
            }

            this.prevFiftyAbove = fiftyAbove;

            if (! fiftyAbove ) {
                return this.resetFinder();
            }

            if ( this.candleClosesBelow(candle, mac200) ) {
                if (++this.countCloseBelow200 >= 3) {
                    io.cdb().labelTop(candle,'A');
                    return this.resetFinder();
                }        
            }

            if (! this.wasTouch ) {
                if ( this.candleClosesBelow(candle,mac50) ) {
                    this.wasTouch = true;
                    io.cdb().labelTop(candle,'T');
                }
                else {
                    return;
                }
            }            

            if (this.isLong) {
                if (! ( candle.isGreen() && (candle.close > mac50) ) ) { return; }
            }
            else {
                if (! ( candle.isRed() && (candle.close < mac50) ) ) { return; }
            }

            const stopFrom = (this.isLong ? candle.low : candle.high );
              
            io.makeEntry(this, (this.isLong ? 'buy' : 'sell'), {
                rrRatio: 1.5,
                stopFrom,
                stopATRRatio: 2,
                //usePrevSwing:true
             });

            this.resetFinder();

        }

    
        candleClosesBelow(candle, level)
        {
            if (this.isLong) {
              return candle.bodyLow() < level;
            }
            return candle.bodyHigh() > level;
        }
}

module.exports = StrategyCrossMA3
