/*
** Avarage True Range
**
**
*/

const AnalayzerIO = require("./AnalayzerIO");
const CDB = require('../types/CandleDebug');

class AnATR extends AnalayzerIO {

        constructor(period) {
            super();
            this.name = 'atr'+period;
            this.ranges = [];
            this.period = period;
            this.prevCandle = undefined;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource('atr');

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
            
            this.setFlag(this.name, atr);
            CDB.offChart(candle,this.name,atr);
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
