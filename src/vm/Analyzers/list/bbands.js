/*
** Indicator: Bollinger Bands
**
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../types/CandleDebug');
const STDDEV = require('../helpers/STDDEV.js');

class BollingerBands extends Analyzer {

        constructor({ period, source, stddev }) {
            super();
            this.source = source || 'c';
            this.period = period || 20;
            this.stddev = stddev || 2;

            this.name = 'bb'+this.source+'-'+this.period+'-'+this.stddev;
            this.values = [];
            this.stdDev = new STDDEV(this.period);
        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const price = this.getDataFromCandle(this.source, candle);
            //const tPrice = (candle.low + candle.high) / 2;

            const dev = this.stddev * this.stdDev.getSTDDEV( price );
            this.values.push( price );

            if (this.values.length < this.period) { return; }
            if (this.values.length > this.period) { this.values.shift(); }

            const sum = this.values.reduce( (a,b) => a + b, 0 );
            const maValue = sum / this.values.length;

            const bandu = maValue + dev;
            const bandd = maValue - dev;

            const res = { u: bandu, d: bandd, m: maValue };
            flags.set(this.name, res);

            CDB.onChart(candle, this.name, res);

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

module.exports = BollingerBands;
