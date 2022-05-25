/*
** Indicator: Exponential Moving Avarage (EMA)
**
** Flags example: emac14 = 56.22
*
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');
const EMA = require('../helpers/EMA.js');

class AnEMA extends Analyzer {

        constructor({ source, period }) {
            super();
            this.source = source || 'c';
            this.period = period || 20;
            this.name = 'ema'+this.source+this.period;
            this.ema = new EMA(this.period);
        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const currentValue = this.ema.getEMA(
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

module.exports = AnEMA;
