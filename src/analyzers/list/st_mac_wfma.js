/*
**  Strategy (SMOOTHED) Moving Avarage 21, 50, 200  + Williams Fractals Entry + RSI>50
**
**  The Moving Avarage Channel
**  (https://www.youtube.com/watch?v=MK47z07tGNM&list=PL9U6PaXicWNNxvSLrti1V5FwTG9Ce3p4E)
**
**
** 1. Price is hovering above mac21 (even wicks dont touch it?)
** 2. mac21 > mac50 > mac200
** 3. rsi14 > 50
** 4. Williams fractal botom is spotted
** 5. ? Maybe only enter first N candles after mac21>mac50>mac200 crossover just established?
** 6. Use Fractal candle low as stopLoss
**
** Guy on the channel used in on Pound/Yen pair, not crypto
*/

const StrategyIO = require("../StrategyIO");
const CDB = require('../../types/CandleDebug');

class StrategyCrossWMA2 extends StrategyIO {
  
        constructor() {
            super();
        }

        getId() { return 'macwfma'; }
        
        getParams(timeframe) {
            return {
                rrRatio: 1.5,
                statsMaxOrders: 4,
                statsOkRatio: 75
            };
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const wf = flags.get('wfractals');
            if (! wf ) { return; }

            const wfCandle = wf.candle;
            const rsi14 = flags.get('rsi14');
            const atr14 = flags.get('atr14');

            const rmac21 = flags.get('rmac9');
            const rmac50 = flags.get('rmac30');
            const rmac200 = flags.get('rmac75');
            
            const isLong = ( wf.type === 'low' );
            let swingSize = 0;

            if (isLong) {
                if (! ((rmac21 > rmac50) && (rmac50 > rmac200)) ) { return; } // check trend
                if ( candle.low <= rmac21 ) { return; } // check hovering above
                if ( rsi14 < 50 ) { return; } // rsi condition is not met
                swingSize = Math.abs(candle.close - wfCandle.low);
            }
            else {
                if (! ((rmac21 < rmac50) && (rmac50 < rmac200)) ) { return; } // check trend
                if ( candle.high >= rmac21 ) { return; } // check hovering above
                if ( rsi14 > 50 ) { return; } // rsi condition is not met
                swingSize = Math.abs(candle.close - wfCandle.high);
            }

            //if ( wfCandle.low <= mac21 ) { return; } // fractal candle not hovering over mac21   
            
            if (swingSize < atr14*0.7) { return; }
            
            flags.get('helper').makeEntry(this, (isLong ? 'buy' : 'sell'), {
                rrRatio: this.getParams(candle.timeframe).rrRatio,
                stopLoss: ( isLong ? wfCandle.low : wfCandle.high )
             });
    
        }

    
}

module.exports = StrategyCrossWMA2;
