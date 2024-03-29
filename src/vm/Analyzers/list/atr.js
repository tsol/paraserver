/*
** Indicator: Avarage True Range (ATR)
**
**
*/

const Analyzer = require("../types/Analyzer");


class AnATR extends Analyzer {

        constructor(period) {
            super();
            this.name = 'atr'+period;
            this.ranges = [];
            this.period = period;
            this.prevCandle = undefined;
        }

        getId() {
            return this.name;
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());

            if (this.prevCandle === undefined) {
                this.prevCandle = candle;
                return;
            }

            this.ranges.push( this.calcTrueRange( this.prevCandle, candle) );

            if (this.ranges.length > this.period) {
                this.ranges.shift();
            }

            const sumRanges = this.ranges.reduce( (a,b) => a + b, 0 );
            const atr = sumRanges / this.ranges.length;

            //console.log(this.ranges);
            //console.log('ATR: len='+this.ranges.length+' sum='+sumRanges+' atr='+atr)
            
            io.set(this.name, atr);
            
            io.cdb().offChart(candle,this.name,atr);
            this.prevCandle = candle;
        }

        calcTrueRange(prevCandle, thisCandle) {
            return Math.max(
                (thisCandle.high - thisCandle.low),
                Math.abs(thisCandle.high - prevCandle.close),
                Math.abs(thisCandle.low - prevCandle.close)
            );
        }


}

module.exports = AnATR;
