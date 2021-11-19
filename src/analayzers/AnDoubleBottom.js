/*
** Double Bottom pattern, depends on AnHLTrend flags 'hl_trend.new.low'
**
**
*/

const AnalayzerIO = require("./AnalayzerIO");
const CDB = require('../types/CandleDebug');

class AnDoubleBottom extends AnalayzerIO {

    constructor() {
        super();
        this.resetFinder();
    }

    resetFinder() {
        this.firstBottom = undefined;
        this.firstZoneUpperLevel = undefined;
        this.secondBottom = undefined;
        this.greenCount = 0;
        this.redCount = 0;
        this.totalCount = 0;
    }




    addCandle(candle, flags) {
        super.addCandle(candle, flags);
        this.resetFlags();
        CDB.setSource('dblbottom');    

        if (this.firstBottom == undefined) {
            this.checkFirstBottom(flags);
            return;
        }

        if (this.candleBelowZone(candle)) {
            CDB.labelBottom(candle,'xB')
            this.resetFinder();
            this.checkFirstBottom(flags);
            return;
        }

        if (this.secondBottom == undefined) {
        
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

        // we have second bottom and a green candle

        if (this.secondBottom && ! candle.isRed() ) {
            CDB.labelTop(candle,'EN');
            this.setFlag('dblbottom.new.entry', candle);
            CDB.circleLow(this.firstBottom, { radius: 2, color: 'yellow' });
            CDB.circleLow(this.secondBottom, { radius: 2, color: 'yellow' });
            this.resetFinder();
        }

    }

    checkFirstBottom(flags) {
        const possibleBottom = flags['hl_trend.new.low']; 
        if (! possibleBottom )
            { return false; }

        const wick = possibleBottom.lowerTailSize();
        if (wick > (flags['atr14'])) {
            return false;
        }

        this.firstBottom = possibleBottom;
        this.firstZoneUpperLevel = Math.min(possibleBottom.open, possibleBottom.close);
        CDB.labelBottom(possibleBottom,'B1');
        return true;
    }


    readyToSpotSecondBottom()
    {
        return (this.greenCount >= 2) && (this.redCount >= 2);
    }

    inZone(y) {
        return (y >= this.firstBottom.low) && (y <= this.firstZoneUpperLevel);
    }

    candleAboveZone(candle)  {
        //const candleLowerBody = Math.min(candle.open, candle.close);
        //return candleLowerBody > this.firstZoneUpperLevel;       
        return candle.low > this.firstZoneUpperLevel;       
    }

    candleBelowZone(candle) {
        const candleLowerBody = Math.min(candle.open, candle.close);
        return candleLowerBody < this.firstBottom.low;       
    }

    candleTouchesZone(candle)
    {
        const candleLowerBody = Math.min(candle.open, candle.close);
        return this.inZone(candleLowerBody) || this.inZone(candle.low);
    }

}

module.exports = AnDoubleBottom;
