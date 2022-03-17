/*
**  Strategy Moving Avarage 200 & 50
**
**  1. Look for MA50 cross up MA200
**  2. If 3 or more candles close below MA200 - skip
**  3. Wait for price to touch MA50
**  4. Wait for first green candle close above MA50
**  5. Enter with 2*ATR14 down and 1.5 ratio
**
*/

const StrategyIO = require("../StrategyIO");
const CDB = require('../../types/CandleDebug');

class StrategyCrossMA3 extends StrategyIO {
  
        constructor() {
            super();
            this.prevFiftyAbove = undefined;
            this.resetFinder();
        }

        getId() { return 'crossma3'; }

        getParams(timeframe) {
            return {
                statsMaxOrders: 10,
                statsOkRatio: 50
            };
        }

        resetFinder() {
            this.wasCross = false;
            this.wasTouch = false;
            this.countCloseBelow200 = 0;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const mac50 = flags.get('mac50');
            const mac200 = flags.get('mac200');

            if (! mac50 || ! mac200 ) { return; }

            const fiftyAbove = mac50.value > mac200.value;

            if (! this.wasCross) {
                if (this.prevFiftyAbove === undefined) {
                    this.prevFiftyAbove = fiftyAbove;
                    return;
                }
                if (! this.prevFiftyAbove && fiftyAbove) {
                    this.wasCross = true;
                    CDB.labelTop(candle,'C');                
                }
                else {
                    this.prevFiftyAbove = fiftyAbove;
                    return;
                }
            }

            this.prevFiftyAbove = fiftyAbove;

            if (! fiftyAbove ) {
                return this.resetFinder();
            }

            if ( candle.bodyLow() < mac200.value ) {
                if (++this.countCloseBelow200 >= 3) {
                    CDB.labelTop(candle,'A');
                    return this.resetFinder();
                }        
            }

            if (! this.wasTouch ) {
                if ( flags.get('mac50.new.touch') === 'down') {
                //if (candle.bodyLow() < mac50.value) {
                    this.wasTouch = true;
                    CDB.labelTop(candle,'T');
                }
                else {
                    return;
                }
            }            

            if (! ( candle.isGreen() && (candle.close > mac50.value)) ) {
                return;
            }

            const helper = flags.get('helper');            
            helper.makeEntry(this, 'buy', {
                rrRatio: 1.5,
                stopATRRatio: 2
             });

            this.resetFinder();

        }

    
}

module.exports = StrategyCrossMA3
