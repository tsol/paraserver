/*
** Indicator: Smoothed (Rolling) Moving Avarage (SMMA / RMA)
**
** Flags example: rmac20 = 56.22
*
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../types/CandleDebug');
const RMA = require('../helpers/RMA.js');

class AnRMA extends Analyzer {

        constructor({ source, period }) {
            super();
            this.source = source || 'c';
            this.period = period || 20;
            this.name = 'rma'+this.source+this.period;
            this.rma = new RMA(this.period);
        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const currentValue = this.rma.getRMA(
                this.getDataFromCandle(this.source, candle)
            );

            flags.set(this.getId(),currentValue);
            CDB.onChart(candle, this.name, currentValue);

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

module.exports = AnRMA;
