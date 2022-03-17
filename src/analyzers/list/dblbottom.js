/*
** Strategy: Double Bottom pattern, depends on AnHLTrend flags 'hl_trend.new.low'
**
**
*/

const StrategyIO = require("../StrategyIO");
const CDB = require('../../types/CandleDebug');

class StrategyDoubleBottom extends StrategyIO {

    static TF_SETTINGS = {
        '1m':   { reqlvl: 40, ratio: 1.35 },
        '3m':   { reqlvl: 40, ratio: 1.35 },
        '5m':   { reqlvl: 40, ratio: 1.35 },
        '15m':  { reqlvl: 40, ratio: 1.35 },
        '30m':  { reqlvl: 40, ratio: 1.35 },
        '1h':   { reqlvl: 40, ratio: 1.35 },
        '4h':   { reqlvl: 40, ratio: 1.35 } 
    };

    constructor() {
        super();
        this.resetFinder();
    }

    getId() { return 'dblbottom'; }

    resetFinder() {
        this.firstBottom = undefined;
        this.firstBottomZoneUp = undefined;
        this.secondBottom = undefined;
        this.greenCount = 0;
        this.redCount = 0;
        this.totalCount = 0;
        this.lowestSecondTail = 0;
        this.highestNeckline = 0;
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
            CDB.labelBottom(candle,'xB')
            this.resetFinder();
            this.checkFirstBottom(flags);
            return;
        }

        if (this.secondBottom == undefined) {
        
            if (candle.bodyHigh() > this.highestNeckline) {
                this.highestNeckline = candle.bodyHigh();
                this.necklineCandle = candle;
            }
    
            if (this.candleAboveZone(candle)) {
                if (candle.isRed()) {
                    this.redCount++;
                } else {
                    this.greenCount++;
                }
            }

            this.totalCount++;

            if (this.totalCount > 25) {
                CDB.labelBottom(candle,'xL')
                this.resetFinder();
                return;
            }

            if (this.readyToSpotSecondBottom() && this.candleTouchesZone(candle)) {
                this.secondBottom = candle;
                CDB.labelBottom(candle,'B2');
            }

        }

        // we have second bottom and now we need to find lowest wick till our entry candle

        if (candle.low < this.lowestSecondTail) {
            this.lowestSecondTail = candle.low;
        }

        // we have second bottom and a green candle

        if (this.secondBottom && this.closesAboveNeckline(candle) ) {
            
            CDB.circleLow(this.firstBottom, { radius: 1.7, color: 'black' });
            CDB.circleLow(this.secondBottom, { radius: 1.7, color: 'black' });

            if ( ! this.makeEntry(candle, flags) ) {
                CDB.labelTop(candle,'NE');
            }

            this.resetFinder();
        }

    }

 

    checkFirstBottom(flags) {
        const possibleBottom = flags.get('hl_trend.new.low'); 
        if (! possibleBottom )
            { return false; }
/*
        if (possibleBottom.lowerTailSize() > possibleBottom.bodySize()*3)
            { return false; }

        const atr = flags.get('atr14');
       
        const wick = possibleBottom.lowerTailSize();
        if (atr && wick > atr * 2) {
            return false;
        }

        const rsi = flags.get('rsi14');
        if (rsi > 30 ) {
            return false;
        } 
*/

        this.firstBottom = possibleBottom;
        this.firstBottomZoneUp = Math.min(possibleBottom.open, possibleBottom.close);
        this.lowestSecondTail = this.firstBottom.low;
        CDB.labelBottom(possibleBottom,'B1');
        return true;
    }


    closesAboveNeckline(candle) {
        return candle.bodyHigh() > this.highestNeckline;
    }

    readyToSpotSecondBottom()
    {
        return (this.greenCount >= 2) && (this.redCount >= 2);
    }

    inZone(y) {
        return (y >= this.firstBottom.low) && (y <= this.firstBottomZoneUp);
    }

    candleAboveZone(candle)  {
        //const candleLowerBody = Math.min(candle.open, candle.close);
        //return candleLowerBody > this.firstBottomZoneUp;       
        return candle.low > this.firstBottomZoneUp;       
    }

    candleBreaksZone(candle) {
        const candleLowerBody = Math.min(candle.open, candle.close);
        return (candleLowerBody < this.firstBottom.low) 
                || (candle.low < this.firstBottom.low);       
    }

    candleTouchesZone(candle)
    {
        const candleLowerBody = Math.min(candle.open, candle.close);
        return this.inZone(candleLowerBody) || this.inZone(candle.low);
    }

    makeEntry(candle, flags) {
        
        const tf = candle.timeframe;
        const settings = StrategyDoubleBottom.TF_SETTINGS[tf];

        if (! settings ) {
            console.log('DBLBOTTOM: no entry for timeframe, no settings');
            return false;
        }
    
        let levelTouchWeight = 0;
        let touchFirst = this.countBottomTouchWeight(this.firstBottom,flags);
        levelTouchWeight += touchFirst.sw;

        let touchSecond = this.countBottomTouchWeight(this.secondBottom,flags);
        levelTouchWeight += touchSecond.sw;

        if (levelTouchWeight < settings.reqlvl ) {
            console.log('DBLBOTTOM: no entry, weight not enough '+levelTouchWeight+' < '
                + settings.reqlvl );
            return false;
        }

        /*
        const rsi = flags.get('rsi14');
        if (! rsi || rsi < 60) {
            return false;
        }
        */

        CDB.labelBottom(this.firstBottom,JSON.stringify(touchFirst));
        CDB.labelBottom(this.secondBottom,JSON.stringify(touchSecond));
        
        CDB.labelTop(candle,'W:'+levelTouchWeight);

        flags.get('helper').makeEntry(this, 'buy', {
            rrRatio: settings.ratio,
            stopFrom: this.necklineCandle.low
         });

        return true;

    }

    countBottomTouchWeight(candle, flags)
    {
        let result = {
            rw: 0, sw: 0, rwH: 0, swH: 0
        };

        const vlevels = flags.get('vlevels');
        if (vlevels) { 
            let bt = vlevels.getCandleBottomTouch(candle);
            result.rw += bt.rw;
            result.sw += bt.sw;
        }

        const vlevels_high = flags.get('vlevels_high');
        if (vlevels_high) { 
            let bt = vlevels_high.getCandleBottomTouch(candle);
            result.rwH += bt.rw;
            result.swH += bt.sw;
        }

        return result;
    }



}

module.exports = StrategyDoubleBottom;
