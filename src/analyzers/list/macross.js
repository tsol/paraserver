/*
**  moving AVG 20, 50, 100 crossing strategy
** 
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');

class StrategyMACross extends AnalyzerIO {
  
        constructor() {
            super();
        }

        getId() { return 'macross'; }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            // if ( candle.timeframe !== '5m' ) { return; }

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
            
            
            if (helper.getOpenOrder(candle.timeframe, this.getId())) {
                console.log('MACROSS: order already open');
                return false;
            }
            
            helper.makeEntry(this.getId(), {
                rrRatio: 1.5,
                lowLevel: lowLevel,
                noMagic: true
             });
    

        }

    
}

module.exports = StrategyMACross;
