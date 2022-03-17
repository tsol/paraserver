/*
** Indicator: Moving Avarage
**
** sets flag (20 candles, source = close example):
** 
** mac20: { 
**         value: 62.2,
**         wicksAbove: 0,           - counts candles fully above mac20 graph
**         wicksBelow: 0,           - same, but below
**         wicksAboveBroke: 5,      - on touch events wicksAbove copied here
**         wicksBelowBroke: 0,      - same but wicksBelow
**         ascend: 3,               - how many candles in a row indicator was rising
**         descend: 0               - how many candles in a row indicator was falling
**     }
** 
** On candle crossing (touching) the indicator generates flag:
**  
** mac20.new.touch = 'up' / 'down'
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
            this.prevResult = undefined;
            this.countAscend = 0;
            this.countDescend = 0;
            this.countWicksAbove = 0;
            this.countWicksBelow = 0;
            this.countWABroke = 0;
            this.countWBBroke = 0;
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
     
            if (candle.low > result) {
                this.countWicksAbove++;
                CDB.labelBottom(candle,'^');                
            }
            else {
                if (this.countWicksAbove > 0) {
                    this.countWicksAbove = 0;
                    flags.set(this.name+'.new.touch','down');
                }
                this.countWABroke = this.countWicksAbove;
            }

            if (candle.high < result) {
                this.countWicksBelow++;
                CDB.labelTop(candle,'v');                
            }
            else {
                if (this.countWicksBelow > 0) {
                    this.countWicksBelow = 0;
                    flags.set(this.name+'.new.touch','up');
                }
                this.countWBBroke = this.countWicksBelow;
            }



            if (result > this.prevResult) {
                this.countAscend++;
                this.countDescend=0;
            }
            else if ( result < this.prevResult) {
                this.countDescend++;
                this.countAscend=0;
            }
            else {
                this.countAscend = 0;
                this.countDescend = 0;
            }

            flags.set(this.name, {
                value: result,
                wicksAbove: this.countWicksAbove,
                wicksBelow: this.countWicksBelow,
                wicksAboveBroke: this.countWABroke,
                wicksBelowBroke: this.countWBBroke,
                ascend: this.countAscend,
                descend: this.countDescend
            });

            this.countWABroke = 0;
            this.countWBBroke = 0;

            CDB.onChart(candle, this.name, result);
            this.prevResult = result;

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


}

module.exports = AnMA;
