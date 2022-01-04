/*
** Moving Avarage
**
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

        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            this.values.push( this.getDataFromCandle(this.source, candle) );

            if (this.values.length > this.period) {
                this.values.shift();
            }

            const sum = this.values.reduce( (a,b) => a + b, 0 );
            const result = sum / this.values.length;
     
            flags.set(this.name, result);
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


}

module.exports = AnMA;
