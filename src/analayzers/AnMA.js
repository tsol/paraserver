/*
** Moving Avarage
**
**
*/

const AnalayzerIO = require("./AnalayzerIO");
const CDB = require('../types/CandleDebug');

class AnMA extends AnalayzerIO {

        constructor(source,period) {
            super();
            this.source = source;
            this.name = 'ma'+source+period;
            this.values = [];
            this.period = period;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource('ma');

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
