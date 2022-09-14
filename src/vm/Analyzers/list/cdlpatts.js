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

const Analyzer = require("../types/Analyzer");


class AnCandlePatterns extends Analyzer {

        constructor() {
            super();
            this.prevCandle = undefined;
            this.lastPatternBias = undefined;
        }

        init(io) {
            this.io = io;
        }

        getId() { return 'cdlpatts'; }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());

            if (this.isShootingStar(candle)) {
                this.setPattern(candle,'shu','down');
            }
            else if (this.isHammer(candle)) {
                this.setPattern(candle,'ham','up');
            }

            if (this.prevCandle !== undefined) {
                             
                if ( this.prevCandle.isGreen() && candle.isRed() ) {
                    if (candle.closeBelow(this.prevCandle)) {
                        this.setPattern(candle,'clb','down'); // close below pattern
                    }
                    else if (candle.close < this.prevCandle.open) {
                        this.setPattern(candle,'egd','down'); // engulfing body candle bearish
                    }
                    return;
                }
    
                if ( this.prevCandle.isRed() && candle.isGreen() ) {
                    if (candle.closeAbove(this.prevCandle)) {
                        this.setPattern(candle,'cla','up'); // close above pattern
                    }
                    else if (candle.close > this.prevCandle.open) {
                        this.setPattern(candle,'egu','up'); // engulfing body candle bullish
                    }
                    return;
                }
                    

            }
            
            this.prevCandle = candle;

            if (this.lastPatternBias) {
                io.set(this.getId()+'.bias',this.lastPatternBias);
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

        setPattern(candle,name,bias) {
            this.io.cdb().circleMiddle(candle,{ color: 'cyan', radius: 3, alpha: 0.1 });
            this.io.cdb().labelBottom(candle,name);
            this.io.set(this.getId()+'.new.'+name,candle);
            this.lastPatternBias = bias;
        }

}

module.exports = AnCandlePatterns;