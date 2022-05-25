/*
** Indicator: Moving Avarage
**
** sets flag (20 candles, source = close example):
** 
** mac20: 62.2
**
** sets candle debug onChart  
**
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');

class AnMA extends Analyzer {

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

        addCandle(candle,io) {
            super.addCandle(candle,io);
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
    
            io.set(this.name, result);

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
