/*
**  Trade Pro Channel - Strategy Moving Avarage 50/100 + Williams Fractals Entry
**  (https://www.youtube.com/watch?v=0Q6iENmeUys)
*/

const Strategy = require("../types/Strategy");
const CDB = require('../../../types/CandleDebug');

class StrategyCrossWMA extends Strategy {
  
        constructor() {
            super();
        }

        getId() { return 'tpcwfma'; }

        getParams(timeframe) {
            return {
                statsMaxOrders: 50,
                statsOkRatio: 35,
                useBtc: 'F'
            };
        }

        init(io)
        {
            io.require('wfractals');
            io.require('mac20');
            io.require('mac50');
            io.require('mac100');

        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            CDB.setSource(this.getId());

            const wf = io.get('wfractals');
            if (! wf) { return; } // no fractal this time
            if (! io.get('mac100') ) { return; } // 100 candles not yet passed

            const isLong = (wf.type === 'low');
            
            const mac20 = io.get('mac20');
            const mac50 = io.get('mac50');
            const mac100 = io.get('mac100');

            let stopLoss = null;

            if (isLong) {
                if ( candle.low > mac20 ) { return; }
                if (! ((mac20 > mac50) && (mac50 > mac100)) ) { return; }
                if ( candle.low < mac100 ) { return; }
                stopLoss = ( candle.low < mac50 ? mac100 : mac50 );
            }
            else {
                if ( candle.high < mac20 ) { return; }
                if (! ((mac20 < mac50) && (mac50 < mac100)) ) { return; }
                if ( candle.high > mac100 ) { return; }
                stopLoss = ( candle.high > mac50 ? mac100 : mac50 );
            }


            io.makeEntry(this, ( isLong ? 'buy' : 'sell'), {
                rrRatio: 1.5,
                stopLoss: stopLoss,
                //usePrevSwing:true
             });
    

        }

    
}

module.exports = StrategyCrossWMA;
