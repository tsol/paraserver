/*
** MACD based filter
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../types/CandleDebug');

class MACDF extends Analyzer {

    static SWITCH_LEN = 16; /* 16 */

    constructor({swlen}) 
    {
        super();

        this.SWLEN = swlen || MACDF.SWITCH_LEN;

        this.switchCount = 0;
        this.switchDirection = 0;
        this.switchLine = 0;
        this.prevMACD = null;
    }

    getId() { return 'macdf'; }

    addCandle(candle,flags) {
        super.addCandle(candle,flags);
        CDB.setSource(this.getId());

        const macd = flags.get('macd');

        if (! macd ) { return; }
        if ( this.prevMACD == null) {
            this.prevMACD = macd;
            return;
        }

        const signCur = macd.h / Math.abs(macd.h);
        const signPrev = this.prevMACD.h / Math.abs(this.prevMACD.h);

        if (signCur !== signPrev) {
            this.switchCount = this.SWLEN;
            this.switchDirection = signCur;
            this.switchLine = macd.m;
        }
        else {

            if (this.switchCount > 0) {
                this.switchCount--;
                if (this.switchCount == 0) {
                    this.switchDirection = 0;
                    this.swithLine = 0;
                }
            }

        }

        let dontRecommend = '';

        if (this.switchDirection > 0) {
            if (this.switchLine < 0) {
                CDB.labelBottom(candle,'DS');
                dontRecommend = 'ds';
            }
        }
        else if (this.switchDirection < 0) {
            if (this.switchLine > 0) {
                CDB.labelBottom(candle,'DB');
                dontRecommend = 'db';
            }
        }

        const res = {
            d: this.switchDirection,
            m: this.switchLine,
            r: dontRecommend
        };

        this.prevMACD = macd;

        flags.set(this.getId(), res);
    }
    
}

module.exports = MACDF;

