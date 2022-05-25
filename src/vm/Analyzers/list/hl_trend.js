/*
** Indicator: hl_trend (High-Low Trend Detection)
**
** Detecting uptrend when candles make higher highs and lower lows
** And downtrend visa-versa
**
** Always sets flag:
** 
** hl_trend: {
**     trend: false,
**     direction: 0,
**     swings: 1,
**     bias: -1
** }
** 
** on new highs or lows detections generates following flags:
** 
** hl_trend.new.high = candleObject
** hl_trend.new.low = candleObject
** 
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');

class AnHLTrend extends Analyzer {

    constructor() {
        super();
        
        this.lastHigh = undefined;
        this.lastLow = undefined;

        this.lowestOnSwing = undefined;
        this.highestOnSwing = undefined;

        this.updateDirection = 0; /* bias, expectations, also swings counter */
        this.trendDirection = 0;  /* confirmed trend -1 or +1 */
    }

    getId() { return 'hl_trend'; }

    resetTrend(byCandle) {

        if ( this.tracingUp() ) {

            if (byCandle !== undefined)
                { CDB.labelTop(byCandle, 'xU '+Math.abs(this.updateDirection)); }

            if (this.lastHigh !== undefined) {
                CDB.labelTop(this.lastHigh,'nFH');
            }
    
            this.lastLow = undefined;
        
            this.lowestOnSwing = undefined;
            this.highestOnSwing = undefined;
        
            this.updateDirection = 0;
            this.trendDirection = 0;

            return;        
        }
        
        if ( this.tracingDown() ) {

            if (byCandle !== undefined)
                { CDB.labelTop(byCandle, 'xD '+Math.abs(this.updateDirection)); }

            if (this.lastLow !== undefined) {
                CDB.labelBottom(this.lastLow,'nFL');
            }

            this.lastHigh = undefined;
            
            this.lowestOnSwing = undefined;
            this.highestOnSwing = undefined;
            
            this.updateDirection = 0;
            this.trendDirection = 0;
        
            return;
        }

        this.lastHigh = undefined;
        this.lastLow = undefined;

        this.lowestOnSwing = undefined;
        this.highestOnSwing = undefined;

        this.updateDirection = 0;
        this.trendDirection = 0;
    }

    addCandle(candle,flags) {
        super.addCandle(candle,flags);
        CDB.setSource(this.getId());

        if (flags.get('extremum')) {
            this.processExtremum(flags.get('extremum'),flags);
        }

        /* current candle punched our trend or expectations */
        if ( this.tracingUp() ) {
            if ( (this.lastLow !== undefined) && candle.tailBelow(this.lastLow)) {
                this.resetTrend(candle);
            }
        }
        else if ( this.tracingDown() ) {
            if ( (this.lastHigh !== undefined) && candle.tailAbove(this.lastHigh)) {
                this.resetTrend(candle);
            }
        }
        
        flags.set('hl_trend',{
            trend: this.isInTrend(),
            direction: this.trendDirection,
            swings: Math.abs(this.updateDirection),
            bias: this.updateDirection
        });
        
    }

    processExtremum(extremumFlag,flags)
    {
        const extremum = extremumFlag;
      
        if ( extremum.type === 'high') {
            this.updateHigherHigh(extremum.candle,flags);
        }
        else {
            this.updateLowerLow(extremum.candle,flags);
        }

        if ( extremum.high ) {
            if (this.lastHigh === undefined ) {
                this.lastHigh = extremum.candle;
                
                flags.set('hl_trend.new.high',extremum.candle);

                CDB.labelTop(extremum.candle,'fH');
                CDB.circleHigh(extremum.candle, {color: 'yellow'});

                if (this.lastLow) { this.updateDirection=1; } /* hoping to find uptrend */

                /*
                if (this.lastLow) {
                    this.startCountCandles(extremum.candle)
                }
                */
            }
            else if (this.highestOnSwing == undefined) {
                this.highestOnSwing = extremum.candle;
            }
            else if (extremum.candle.tailAbove(this.highestOnSwing)) {
                this.highestOnSwing = extremum.candle;
            }    
        }

        if ( extremum.low ) {
            if (this.lastLow === undefined ) {
                this.lastLow = extremum.candle;
                
                flags.set('hl_trend.new.low',extremum.candle);

                CDB.labelBottom(extremum.candle,'fL');
                CDB.circleLow(extremum.candle, {color: 'yellow'});

                if (this.lastHigh) { this.updateDirection=-1; } /* hoping to find down trend */
                /*
                if (this.lastHigh) {
                    this.startCountCandles(extremum.candle)
                }
                */
            }
            else if (this.lowestOnSwing == undefined) {
                this.lowestOnSwing = extremum.candle;
            }
            else if (extremum.candle.tailBelow(this.lowestOnSwing)) {
                this.lowestOnSwing = extremum.candle;
            }
        }

        // todo: decide if trend is in order and set direction

        if (! this.isInTrend() ) {

            // there were 2 higher highs update
            if (this.updateDirection >= 3) {
                this.registerTrend(1);
                CDB.labelTop(extremum.candle,'UP');
                CDB.circleHigh(extremum.candle, {color: 'blue'});
            }
            else if (this.updateDirection <= -3) {
                this.registerTrend(-1);
                CDB.labelBottom(extremum.candle,'DN');
                CDB.circleLow(extremum.candle, {color: 'blue'});
            }

        }

    }

    updateHigherHigh(candle,flags) {
        
        if (this.lastHigh == undefined)
            { return; }

        if (candle.tailAbove(this.lastHigh)) {

            /* new higher hight or first hight */
            if ( this.tracingUp() || this.tracingNowhere() ) {

                if ( this.tracingUp() 
                    && (this.lastLow !== undefined)
                    && (this.lowestOnSwing !== undefined)
                ) {
                    this.lastLow = this.lowestOnSwing;
                    this.lowestOnSwing = undefined;

                    flags.set('hl_trend.new.low',this.lastLow);

                    CDB.circleLow(this.lastLow, {color:'green'});
                    CDB.labelBottom(this.lastLow, 'HL');
                    this.updateDirection++;
                }

                this.lastHigh = candle;
                this.updateDirection++;

                flags.set('hl_trend.new.high',candle);
                CDB.circleHigh(candle, {color: 'green'});
                CDB.labelTop(candle,'HH');
                
                //console.log('hl_trend_higher_high');
                return;
            }

            /* Trend DOWN & higher high */

            this.resetTrend(candle);
            CDB.circleHigh(candle,{color:'red',radius: 3});

            return;
        }
              
        /* confirm down trend setting a lower high */
       
        /*
        if ( this.tracingDown() || this.tracingNowhere() ) {
            this.lastHigh = candle;
            this.updateDirection--;
            CDB.circleHigh(candle, {color: 'green'});
            CDB.labelTop(candle,'LH');
            return;
        } 
        */

        /* just an lower hight while uptrend */
            
    }

    updateLowerLow(candle, flags) {

        if (this.lastLow === undefined) {
            return;
        }

        /* LOWER LOW */

        if (candle.tailBelow(this.lastLow)) {

            /* new lower low is below prev */
            if ( this.tracingDown() || this.tracingNowhere() ) {

                if ( this.tracingDown()
                    && (this.lastHigh !== undefined)
                    && (this.highestOnSwing !== undefined)
                ) {
                    this.lastHigh = this.highestOnSwing;
                    this.highestOnSwing = undefined;
                    
                    flags.set('hl_trend.new.high',this.lastHigh);
                    
                    CDB.circleHigh(this.lastHigh, {color:'green'});
                    CDB.labelTop(this.lastHigh, 'LH');
                    this.updateDirection--;
                }

                this.lastLow = candle;
                this.updateDirection--;
                //console.log('hl_trend_lower_low');

                flags.set('hl_trend.new.low',candle);
                    
                CDB.circleLow(candle, {color: 'red'});
                CDB.labelBottom(candle,'LL');
            
                return;
            }

            this.resetTrend(candle);
            CDB.circleLow(candle,{color:'red',radius: 3});

            //throw new Error('this should never happen 3');

            return;
        }
            

        /* confirm up trend setting a higher low */
        /*
        if ( this.tracingUp() || this.tracingNowhere() ) {
            this.lastLow = candle;
            this.updateDirection++;
            CDB.circleLow(candle, {color: 'green'});
            CDB.labelBottom(candle,'HL');
            return;
        } 
        */

        /* just a higher low during tracingDown */

    }

    isInTrend() { return this.trendDirection !== 0; }
    isUptrend() { return this.trendDirection > 0; };
    isDowntrend() { return this.trendDirection < 0; }

    tracingUp() { return (this.updateDirection > 0) || this.isUptrend(); }
    tracingDown() { return (this.updateDirection < 0) || this.isDowntrend(); }
    tracingNowhere() { return (! this.isInTrend() ) && (this.updateDirection == 0); }

    registerTrend(direction)
    {
        /* todo: add first candle really started trend? */
        this.trendDirection = direction;
    }


}

module.exports = AnHLTrend;