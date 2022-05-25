/*
** Moving Avarage Trend
*/
const Analyzer = require("../types/Analyzer");
const CDB = require('../../types/CandleDebug');

class MATREND extends Analyzer {

    static MAX_DIV_NEG = 1;

    constructor({ma1,ma2,ma3,name}) 
    {
        super();
        this.ma1 = ma1;
        this.ma2 = ma2;
        this.ma3 = ma3;
        this.name = 'mat'+name;
        this.prevTrend = null;
        this.resetFinder();
    }

    getId() { return this.name; }

    resetFinder() {
        this.currentTrend = 'NO';
        this.prevDiv = null;
        this.cntDivNeg = 0;
    }

    addCandle(candle,flags) {
        super.addCandle(candle,flags);
        CDB.setSource(this.getId());

        let trend = 'NO';

        const ma1 = flags.get(this.ma1);
        const ma2 = flags.get(this.ma2);
        const ma3 = flags.get(this.ma3);
        
        if ( (ma1 > ma2) && (ma2 > ma3)) {
            trend = 'UP';
        }

        if ( (ma1 < ma2) && (ma2 < ma3) ) {
            trend = 'DN';
        }

        if (this.prevTrend && (this.prevTrend !== trend)) {
            this.prevTrend = null;
        }

        if (trend == 'NO') {
            if (this.currentTrend != 'NO') {
                this.prevTrend = this.currentTrend;
                this.resetFinder();
                CDB.labelBottom(candle,'X'); // break trend
            }
            return flags.set(this.name,trend);
        }

        if (this.currentTrend == 'NO') { // dont set trend until switch
            if (this.prevTrend == trend) {
                return flags.set(this.name,'NO');
            }
        }

        if (trend !== this.currentTrend) {
            this.resetFinder();
            this.currentTrend = trend;
            this.prevDiv = Math.abs(ma1-ma2);
            CDB.labelBottom(candle,trend);
            return flags.set(this.name,trend);
        }

        const curDiv = Math.abs(ma1-ma2);

        if (this.prevDiv > curDiv) {
            this.cntDivNeg++;
            if (this.cntDivNeg > MATREND.MAX_DIV_NEG) {
                this.prevTrend = this.currentTrend;
                this.resetFinder();
                trend = 'NO';
                CDB.labelBottom(candle,'xN');
                return flags.set(this.name,trend);
            }         
        }

        this.prevDiv = curDiv;

        CDB.labelTop(candle,(trend == 'UP' ? '^' : 'v'))

        flags.set(this.name, trend);
    
    }
    
}

module.exports = MATREND;

