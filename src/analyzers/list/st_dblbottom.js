/*
** Strategy: Double Bottom pattern, depends on AnHLTrend flags 'hl_trend.new.low'
**
**
*/

const StrategyIO = require("../StrategyIO");
const CDB = require('../../types/CandleDebug');

class StrategyDoubleBottom extends StrategyIO {

    static MAX_BOTTOMS_LENGTH   = 25;
    static MAX_ENTRY_LENGTH     = 40;
    
    static DBG_BOTTOMS          = { radius: 1.7, color: 'black' };

    static TF_SETTINGS = {
        '5m':   { reqlvl: 40, ratio: 1.35 }
    };

    getParams(timeframe) {
        return {
            statsMaxOrders: 1,
            statsOkRatio: 0
        };
    }
    constructor(isLong) {
        super();
        this.isLong = isLong;
        this.name = 'dbl'+(isLong ? 'bottom' : 'top');
        this.resetFinder();
    }

    getId() { return this.name; }

    resetFinder() {
        this.firstBottom = undefined;
        this.firstBottomY0 = undefined;
        this.firstBottomY1 = undefined;

        this.secondBottom = undefined;
        this.greenCount = 0;
        this.redCount = 0;
        this.totalCount = 0;
        
        this.highestNeckline = undefined;
        this.necklineCandle = undefined;
    }

 

    addCandle(candle, flags) {
        super.addCandle(candle, flags);
        
        CDB.setSource(this.getId());    

        if (this.firstBottom == undefined) {
            this.checkFirstBottom(flags);
            return;
        }

        if (this.candleBreaksZone(candle)) {
            this.label(candle,'xB')
            this.resetFinder();
            this.checkFirstBottom(flags);
            return;
        }

        if (this.secondBottom == undefined) {
        
            this.updateNeckline(candle);

            if (this.candleAboveZone(candle)) {
                if (candle.isRed())
                    { this.redCount++; } else { this.greenCount++; }
            }

            this.totalCount++;

            if (this.totalCount > StrategyDoubleBottom.MAX_BOTTOMS_LENGTH) {
                this.label(candle,'xL')
                this.resetFinder();
                return;
            }

            if (this.readyToSpotSecondBottom() && this.candleTouchesZone(candle)) {
                this.secondBottom = candle;
                this.label(candle,'B2');
            }

        }

        // we have second bottom and a closure above neckline

        if (this.secondBottom && this.closesAboveNeckline(candle) ) {
            
            this.circle(this.firstBottom, StrategyDoubleBottom.DBG_BOTTOMS);
            this.circle(this.secondBottom, StrategyDoubleBottom.DBG_BOTTOMS);
            
            if ( ! this.makeEntry(candle, flags) ) {
                this.label(candle,'NE');
            }

            return this.resetFinder();
        }

        // Limit length search for breaking neck

        if (++this.totalCount > StrategyDoubleBottom.MAX_ENTRY_LENGTH) {
            this.label(candle,'xN')
            return this.resetFinder();
        }


    }

 

    checkFirstBottom(flags) {
        const possibleBottom = flags.get('hl_trend.new.'+(this.isLong ? 'low' : 'high')); 
        if (! possibleBottom )
            { return false; }

        this.firstBottom = possibleBottom;

        if (this.isLong) {
            this.firstBottomY0 = possibleBottom.low;
            this.firstBottomY1 = Math.min(possibleBottom.open, possibleBottom.close);
        }
        else {
            this.firstBottomY0 = Math.max(possibleBottom.open, possibleBottom.close);
            this.firstBottomY1 = possibleBottom.high;
        }
        this.label(possibleBottom,'B1');
        return true;
    }

    label(candle,text) {
        if (this.isLong) {
            return CDB.labelBottom(candle,text);
        }
        return CDB.labelTop(candle,text);
    }

    circle(candle,param) {
        if (this.isLong) {
            return CDB.circleLow(candle, param);
        }
        return CDB.circleHigh(candle,param);
    }

    updateNeckline(candle)
    {
        if (this.isLong) {
            if ( (this.highestNeckline === undefined) || (candle.bodyHigh() > this.highestNeckline)) {
                this.highestNeckline = candle.bodyHigh();
                this.necklineCandle = candle;
            }
            return;
        }
        if ((this.highestNeckline === undefined) || (candle.bodyLow() < this.highestNeckline)) {
            this.highestNeckline = candle.bodyLow();
            this.necklineCandle = candle;
        }
    }

    closesAboveNeckline(candle) {
        if (this.isLong) {
            return candle.bodyHigh() > this.highestNeckline;
        }
        return candle.bodyLow() < this.highestNeckline;
    }

    readyToSpotSecondBottom()
    {
        return (this.greenCount >= 2) && (this.redCount >= 2);
    }

    inZone(y) {
        return (y >= this.firstBottomY0) && (y <= this.firstBottomY1);
    }

    candleAboveZone(candle)  {
        if (this.isLong) {
            return candle.low > this.firstBottomY1;
        }
        return candle.high < this.firstBottomY0;
    }

    candleBreaksZone(candle) {
        if (this.isLong) {
            return candle.low <= this.firstBottomY0;
        }
        return candle.high >= this.firstBottomY1;      
    }

    candleTouchesZone(candle)
    {
        if (this.isLong) {
            return this.inZone(candle.low);
        }
        return this.inZone(candle.high);
    }

    


    makeEntry(candle, flags) {
        
        const tf = candle.timeframe;
        const settings = StrategyDoubleBottom.TF_SETTINGS[tf];

        if (! settings ) {
            console.log('DBLBOTTOM: no entry for timeframe, no settings');
            return false;
        }
    
        let levelTouchWeight = 0;
        let touchFirst = this.countTouchWeights(this.firstBottom,flags);
        levelTouchWeight += ( this.isLong ? touchFirst.sw : touchFirst.rw );

        let touchSecond = this.countTouchWeights(this.secondBottom,flags);
        levelTouchWeight += ( this.isLong ? touchSecond.sw : touchSecond.rw );

        if (levelTouchWeight < settings.reqlvl ) {
            console.log('DBLBOTTOM: no entry, weight not enough '+levelTouchWeight+' < '
                + settings.reqlvl );
            return false;
        }

        //this.label(this.firstBottom,JSON.stringify(touchFirst));
        //this.label(this.secondBottom,JSON.stringify(touchSecond));
        
        this.label(candle,'W:'+levelTouchWeight);

        flags.get('helper').makeEntry(this, ( this.isLong ? 'buy' : 'sell' ), {
            rrRatio: settings.ratio,
            stopFrom: ( this.isLong ? this.necklineCandle.high : this.necklineCandle.low )
        });

        return true;

    }

    countTouchWeights(candle, flags)
    {
        let result = {
            rw: 0, sw: 0, rwH: 0, swH: 0
        };

        const vlevels = flags.get('vlevels');
        if (vlevels) { 
            let bt = ( this.isLong ? 
                    vlevels.getBottomTouchWeights(candle) :
                    vlevels.getTopTouchWeights(candle)
            );
            result.rw += bt.rw;
            result.sw += bt.sw;
        }

        const vlevels_high = flags.get('vlevels_high');
        if (vlevels_high) { 
            let bt = ( this.isLong ?
                vlevels_high.getBottomTouchWeights(candle) :
                vlevels_high.getTopTouchWeights(candle)
            );
            result.rwH += bt.rw;
            result.swH += bt.sw;
        }

        return result;
    }

}

module.exports = StrategyDoubleBottom;
