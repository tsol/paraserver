/*
** Candle Patterns: 
**      38.2% (shooting star / hammer)
**      Engulfing candle
**      Close Above/Below

** generates flags:
**      cdlpatts.new.shu = candle object (shooting star)
**      cdlpatts.new.ham = candle object (hammer)
**      cdlpatts.new.egd = candle object (engulfing candle down)
**      cdlpatts.new.egu = candle object (engulfing candle up)
**      cdlpatts.new.cla = candle object (close above)
**      cdlpatts.new.clb = candle object (close below)
**
** also sets flag:
**      cdlpatts.bias = up / down - last recognized pattern bias (including current candle) 
**                      this flag is peristent and always set since the first recognition 
**                                                       
** 
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');

class AnCandlePatterns extends AnalyzerIO {

        constructor() {
            super();
            this.prevCandle = undefined;
            this.lastPatternBias = undefined;
        }

        getId() { return 'cdlpatts'; }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            if (this.isShootingStar(candle)) {
                this.setPattern(candle,flags,'shu','down');
            }
            else if (this.isHammer(candle)) {
                this.setPattern(candle,flags,'ham','up');
            }

            if (this.prevCandle !== undefined) {
                             
                if ( this.prevCandle.isGreen() && candle.isRed() ) {
                    if (candle.closeBelow(this.prevCandle)) {
                        this.setPattern(candle,flags,'clb','down'); // close below pattern
                    }
                    else if (candle.close < this.prevCandle.open) {
                        this.setPattern(candle,flags,'egd','down'); // engulfing body candle bearish
                    }
                    return;
                }
    
                if ( this.prevCandle.isRed() && candle.isGreen() ) {
                    if (candle.closeAbove(this.prevCandle)) {
                        this.setPattern(candle,flags,'cla','up'); // close above pattern
                    }
                    else if (candle.close > this.prevCandle.open) {
                        this.setPattern(candle,flags,'egu','up'); // engulfing body candle bullish
                    }
                    return;
                }
                    

            }
            
            this.prevCandle = candle;

            if (this.lastPatternBias) {
                flags.set(this.getId()+'.bias',this.lastPatternBias);
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

        setPattern(candle,flags,name,bias) {
            CDB.circleMiddle(candle,{ color: 'cyan', radius: 3, alpha: 0.1 });
            CDB.labelBottom(candle,name);
            flags.set(this.getId()+'.new.'+name,candle);
            this.lastPatternBias = bias;
        }

}

module.exports = AnCandlePatterns;