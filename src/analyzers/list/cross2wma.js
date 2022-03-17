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

        getId() { return 'cross2wma'; }
        
        getParams(timeframe) {
            return {
                statsMaxOrders: 100,
                statsOkRatio: 50
            };
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            const wf = flags.get('wfractals');
            // no low fractal spotted this time, so just skip
            if (! wf || wf.type !== 'low') { return; }

            const rmac21 = flags.get('rmac9');
            const rmac50 = flags.get('rmac30');
            const rmac200 = flags.get('rmac75');

/*
            const rmac21 = flags.get('rmac9');
            const rmac50 = flags.get('rmac21');
            const rmac200 = flags.get('rmac30');
*/
            
            // check trend
            if (! ((rmac21 > rmac50) && (rmac50 > rmac200)) ) { return; }
    
            // check hovering above
            if ( candle.low <= rmac21 ) { return; }

            const wfCandle = wf.candle;
            // fractal candle not hovering over mac21
            //if ( wfCandle.low <= mac21.value ) { return; }
    
            const rsi14 = flags.get('rsi14');
            // rsi condition is not met
            if (rsi14 <= 50) { return; }
    
            const atr14 = flags.get('atr14');
            if (! atr14) { return; }

            const swingSize = Math.abs(candle.close - wfCandle.low);
            if (swingSize < atr14*0.7) { return; }
            
            flags.get('helper').makeEntry(this, 'buy', {
                rrRatio: 1.5,
                stopLoss: wfCandle.low,
                //stopATRRatio: 1
             });
    
        }

    
}

module.exports = StrategyCrossWMA2;
