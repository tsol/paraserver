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

            const hl_higher_trend = flags.getHTF('hl_trend');
            const extremum = flags.get('extremum');
            
            if (hl_higher_trend && extremum ) {
                CDB.labelBottom(candle,'B:'+hl_higher_trend.bias);
            }

            /*            
            let cdlL = flags.get('hl_trend.new.low');
            let cdlH = flags.get('hl_trend.new.high');

            if (cdlL) {
                CDB.labelBottom(cdlL,'B:'+hl_trend.bias);
            }
            if (cdlH) {
                CDB.labelBottom(cdlH,'B:'+hl_trend.bias);
            }
*/


        }

        makeEntry(candle, flags) {
    
            /*

            flags.set('entry',{
                    strategy: 'touchma',
                    atCandle: candle,
                    type: 'buy',
                    takeProfit: takeProfit,
                    stopLoss: stopLoss,
                    comment: cmt	
            });

            CDB.labelTop(candle,'EN');
            */

            return true;
        }
    
}

module.exports = StrategyMACross;
