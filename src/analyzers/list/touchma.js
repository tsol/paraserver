/*
** 38.2 candle wick off MA20 Strategy
** demands: AnMA, AnCandlePatterns
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');

class AnTouchMA extends AnalyzerIO {

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

            if (ma.wicksAboveBroke > AnTouchMA.MIN_LENGTH) {
          
                const hammer = flags.get('cdlpatts.new.hammer');

                if (hammer) {

                    if (hammer.totalSize() > atr*2) {
                        CDB.labelTop(hammer,'NO');
                        return;
                    }

                    flags.get('helper').makeEntry(this.getId(), { rrRatio: 1 });

                }
            }

        }

    
}

module.exports = AnTouchMA;
