/*
** Candle Patterns: 
**      38.2% (shooting star / hammer)
**      Engulfing candle
**      Close Above/Below
*/

const AnalayzerIO = require("./AnalayzerIO");
const CDB = require('../types/CandleDebug');

class AnCandlePatterns extends AnalayzerIO {

        constructor(period) {
            super();
            this.prevCandle = undefined;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource('candlepatterns');

            if (this.isShootingStar(candle)) {
                CDB.labelBottom(candle,'SHU');
                this.debugCircle(candle);
            }
            else if (this.isHammer(candle)) {
                CDB.labelBottom(candle,'HAM');
                this.debugCircle(candle);
            }

            if (this.prevCandle !== undefined) {
                this.checkCloseAboveBelowEngulfing(candle);        
            }
            
            this.prevCandle = candle;

        }

        checkCloseAboveBelowEngulfing(candle) {
            const possibleUp    = ( this.prevCandle.isRed() && (!candle.isRed()) );
            const possibleDown  = ( (!this.prevCandle.isRed()) && candle.isRed() ); 

            if ( possibleDown ) {
                if (candle.closeBelow(this.prevCandle)) {
                    CDB.labelTop(candle,'CLb');
                    this.debugCircle(candle);
                }
                else if (candle.close < this.prevCandle.open) {
                    CDB.labelTop(candle,'ENd');
                    this.debugCircle(candle);
                }
                return;
            }

            if ( possibleUp ) {
                if (candle.closeAbove(this.prevCandle)) {
                    CDB.labelTop(candle,'CLa');
                    this.debugCircle(candle);
                }
                else if (candle.close > this.prevCandle.open) {
                    CDB.labelTop(candle,'ENu');
                    this.debugCircle(candle);
                }
                return;
            }

        }


        isShootingStar(candle) {
            const c = candle.close - candle.low;
            const o = candle.open - candle.low;
            const h = candle.high - candle.low;
            const target = h * 0.382;
            return ( (o<target) && (c<target) );
        }

        isHammer(candle) {
            const c = candle.close - candle.low;
            const o = candle.open - candle.low;
            const h = candle.high - candle.low;
            const target = h * 0.618;
            return ( (o>target) && (c>target) );
        }

        debugCircle(candle) {
            CDB.circleMiddle(candle,{ color: 'blue', radius: 5, alpha: 0.1 });
        }

}

module.exports = AnCandlePatterns;