/*
** Moving Avarage
**
** sets flag example:

atr14: { 
        value: 62.2,
        wicksAbove: 0,
        wicksBelow: 0,
        wicksAboveBroke: 5,
        wicksBelowBroke: 0
    }

**  
** sets candle debug onChart  
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');

class AnMA extends AnalyzerIO {

        constructor({ source, period }) {
            super();
            this.source = source || 'c';
            this.period = period || 20;
            this.name = 'ma'+this.source+this.period;
            this.values = [];
            this.resetFinder();
        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            this.values.push( this.getDataFromCandle(this.source, candle) );

            if (this.values.length < this.period) {
                return;
            }

            if (this.values.length > this.period) {
                this.values.shift();
            }

            const sum = this.values.reduce( (a,b) => a + b, 0 );
            const result = sum / this.values.length;
     
            this.countAboveBelow(result, candle);

            flags.set(this.name, {
                value: result,
                wicksAbove: this.countWicksAbove,
                wicksBelow: this.countWicksBelow,
                wicksAboveBroke: this.countWABroke,
                wicksBelowBroke: this.countWBBroke
            });

            this.countWABroke = 0;
            this.countWBBroke = 0;

            CDB.onChart(candle, this.name, result);

        }

        getDataFromCandle(sourceCode, candle) {
            let data = undefined;
            switch (sourceCode) {
                case 'c': { data = candle.close; break; }
                case 'o': { data = candle.open; break; }
                case 'h': { data = candle.high; break; }
                case 'l': { data = candle.low; break; }
                default: { throw new Error('unknown source code for moving avarage'); }
            }
            return data;
        }

        resetFinder() {
            this.countWicksAbove = 0;
            this.countWicksBelow = 0;
            this.countWABroke = 0;
            this.countWBBroke = 0;
        }

        countAboveBelow(currentValue, candle)
        {
            if (candle.low > currentValue) {
                this.countWicksAbove++;
                CDB.labelBottom(candle,'^');                
            }
            else {
                this.countWABroke = this.countWicksAbove;
                this.countWicksAbove = 0;
            }

            if (candle.high < currentValue) {
                this.countWicksBelow++;
                CDB.labelTop(candle,'v');                
            }
            else {
                this.countWBBroke = this.countWicksBelow;
                this.countWicksBelow = 0;
            }

        }
}

module.exports = AnMA;
