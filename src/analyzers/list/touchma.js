/*
** Strategy: 38.2 candle (hammer) wick off MA20
** Depends on: mac20, atr14, cdlpatts
**
*/

const StrategyIO = require("../StrategyIO");
const CDB = require('../../types/CandleDebug');

class StrategyTouchMA extends StrategyIO {

        static MIN_LENGTH = 5; /* minumum candles to close above ma20 */

        constructor() {
            super();
        }

        getId() { return 'touchma'; }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const atr = flags.get('atr14');
            const ma = flags.get('mac20');

            if (! ma || ! atr ) { return false; }

            if (ma.wicksAboveBroke > StrategyTouchMA.MIN_LENGTH) {
          
                const hammer = flags.get('cdlpatts.new.ham');

                if (hammer) {

                    if (hammer.totalSize() > atr*2) {
                        CDB.labelTop(hammer,'NO');
                        return;
                    }

                    flags.get('helper').makeEntry(this, 'buy', { rrRatio: 1 });

                }
            }

        }

    
}

module.exports = StrategyTouchMA;
