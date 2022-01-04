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
            this.resetFinder();
        }

        getId() { return 'touchma'; }

        resetFinder() {
            this.countAbove = 0;
        }

        weAboveMa() {
            return this.countAbove >= AnTouchMA.MIN_LENGTH;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const ma = flags.get('mac20');

            if ( (candle.close <= ma) || (candle.open <= ma) ) {
                
                if (this.weAboveMa()) {
                    CDB.labelTop(candle,'^x');
                }

                this.resetFinder();
                return;
            }

            if (this.weAboveMa()) {

                const hammer = flags.get('new.cpatt.hamm');
                if (hammer && hammer.isGreen()) {
                    if (hammer.low <= ma) {

                        if (hammer.totalSize() > flags.get('atr14')*2) {
                            CDB.labelTop(hammer,'^xS');
                            this.resetFinder();
                            return;
                        }

                        this.makeEntry(hammer, flags);
                        this.resetFinder();
                    }

                }
            }

            if (candle.low > ma) {
                this.countAbove++;
                CDB.labelBottom(candle,'^');                
            }

        }


        makeEntry(candle, flags) {
    
            const higherTrend = flags.getHTF('hl_trend');
            let htMsg = '';
    
            if (! higherTrend || ! (higherTrend.direction > 0) || (higherTrend.swings < 4) ) {
                console.log('ANTOUCHMA: no entry higher trend not detected');
                return false;
            }
            else {
                htMsg = ' HT: '+higherTrend.direction+'/'+higherTrend.swings;
            }
    
            const entryPrice = candle.close;
            const stopLoss = candle.low - flags.get('atr14'); 
            const stopHeight = entryPrice - stopLoss;
            const takeProfit = entryPrice + stopHeight * 1;
    
            flags.set('entry',{
                    strategy: 'touchma',
                    atCandle: candle,
                    type: 'buy',
                    takeProfit: takeProfit,
                    stopLoss: stopLoss	
            });

            CDB.labelTop(candle,'EN'+htMsg);
            CDB.circleMiddle(candle,{ color: 'blue', radius: 5, alpha: 0.1 });

            return true;
        }
    

}

module.exports = AnTouchMA;
