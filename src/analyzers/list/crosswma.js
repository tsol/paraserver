/*
**  Strategy Moving Avarage 50/100 + Williams Fractals Entry
**  Trading Pro Channel (https://www.youtube.com/watch?v=0Q6iENmeUys)
*/

const StrategyIO = require("../StrategyIO");
const CDB = require('../../types/CandleDebug');

class StrategyCrossWMA extends StrategyIO {
  
        constructor() {
            super();
        }

        getId() { return 'crosswma'; }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const wf = flags.get('wfractals');
            if (! wf) { return; }

            if (! flags.get('mac100') ) {
                return;
            }

            const mac20 = flags.get('mac20').value;

            if ( candle.low > mac20 ) {
                return;
            }

            const mac50 = flags.get('mac50').value;
            const mac100 = flags.get('mac100').value;

            if (! mac100 ) {
                return false;
            }

            if (! ((mac20 > mac50) && (mac50 > mac100)) ) {
                return;
            }

            if ( candle.low < mac100 ) {
                return;
            }

            if (wf.type !== 'low') {
                return false;
            }

            const helper = flags.get('helper');
            const lowLevel = ( candle.low < mac50 ? mac100 : mac50 );
            
            
            helper.makeEntry(this, 'buy', {
                rrRatio: 1.5,
                stopLoss: lowLevel,
             });
    

        }

    
}

module.exports = StrategyCrossWMA;
