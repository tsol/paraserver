/*
** USD Volume 
**
** 
*
*/

const Analyzer = require("../types/Analyzer");

const RMA = require('../helpers/RMA.js');

const { fnum } = require('../../../helper.js');


class USDVOL extends Analyzer {

        constructor({ period }) {
            super();
            this.period = period || 14;
            this.name = 'usdv'+this.period;
            this.rma = new RMA(this.period);
        }

        getId() {
            return this.name;
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());

            const curValue = fnum(this.rma.getRMA( (candle.volume * candle.close) / 1000 ),3);
            
            io.set(this.getId(),curValue);
            io.cdb().onChart(candle, this.name, curValue);
        }

}

module.exports = USDVOL;
