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

const Strategy = require("../types/Strategy");


class StrategyCrossWMA2 extends Strategy {
  
        constructor() {
            super();
            this.prevCandle = null;
        }

        getId() { return 'macwfma'; }
        
        getParams(timeframe) {
            return {
                rrRatio: 1.5,
                statsMaxOrders: 50,
                statsOkRatio: 35,
                useBtc: 'F'
            };
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());
            this.run(candle,io);
            this.prevCandle = candle;
        }

        init(io)
        {
            io.require('wfractals');
            io.require('atr14');
            io.require('rsi14');
            io.require('rmac9');
            io.require('rmac30');
            io.require('rmac75');
        }

        run(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());

            const wf = io.get('wfractals');
            if (! wf ) { return; }

            const wfCandle = wf.candle;
            const rsi14 = io.get('rsi14');
            const atr14 = io.get('atr14');

            const rmac21 = io.get('rmac9');
            const rmac50 = io.get('rmac30');
            const rmac200 = io.get('rmac75');

            const isLong = ( wf.type === 'low' );
            let swingSize = 0;

            // filter out by harry if the entry fractal candle
            // shows pressue from unwanted direction
            //let cnt=0;
            //if (this.negativePressue(wfCandle, isLong)) { cnt++; }
            //if (this.negativePressue(this.prevCandle, isLong)) { cnt++; }
            //if (this.negativePressue(candle, isLong)) { cnt++; }
            //if (cnt >= 3) { return; }

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
            
           // if (swingSize < atr14*0.7) { return; }
 
            io.makeEntry(this, (isLong ? 'buy' : 'sell'), {
                rrRatio: this.getParams(candle.timeframe).rrRatio,
                stopLoss: ( isLong ? wfCandle.low : wfCandle.high )
                //usePrevSwing:true
             });
    
        }

        negativePressue(candle, isLong)
        {
            if (! candle ) { return false; }
            if (isLong) {
                if (candle.bodySize() < candle.upperTailSize()) {
                    io.cdb().labelTop(candle,'Xt');
                    return true;
                }
            }
            else {
                if (candle.bodySize() < candle.lowerTailSize()) {
                    io.cdb().labelBottom(candle,'Xt');
                    return true;
                }
            }
            return false;
        }

    
}

module.exports = StrategyCrossWMA2;
