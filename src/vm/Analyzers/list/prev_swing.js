/*
** Using hl_trend remembers previous swing high and swing low
*/

const Analyzer = require("../types/Analyzer");
const CDB = require('../../../types/CandleDebug');

const { TF } = require('../../../types/Timeframes.js');

class PrevSwing extends Analyzer {

    static MAX_CANDLE_LENGTH = 100;

    constructor() {
        super();
        this.highs = [];
        this.lows = [];
        this.lastCandle = null;
    }

    init(io)
    {
        io.require('hl_trend');
        io.require('hills');
    }

    getId() { return 'prev_swing'; }

    addCandle(candle,io) {
        super.addCandle(candle,io);
        this.lastCandle = candle;

        const h = io.get('hl_trend.new.high');
        if (h) { this.highs.unshift(h); }

        const l = io.get('hl_trend.new.low');
        if (l) { this.lows.unshift(l); }
        
        // hills can apear with serious delay, so we make sure to
        // resort array
        const hh = io.get('hills.new.high');
        if (hh) { 
            if ( ! this.highs.find( i => i == hh ) ) { 
                this.highs.unshift(hh);
                this.highs.sort( (a,b) => b.openTime - a.openTime );
            }
        }

        const lh = io.get('hills.new.low');
        if (lh) {
            if ( ! this.lows.find( i => i == lh ) ) {
                this.lows.unshift(lh);
                this.highs.sort( (a,b) => b.openTime - a.openTime );
            }
        }

        this.forgetBefore(this.getTimeCandlesBack(candle,PrevSwing.MAX_CANDLE_LENGTH));

        io.set(this.getId(),this);   
    }

    findHigh(maxCandlesBack,closesAbove) {
        if (! this.lastCandle ) { return null; }
        const fromTime = this.getTimeCandlesBack(this.lastCandle,maxCandlesBack);
        return this.highs.find( c => (c.openTime > fromTime) && (c.bodyHigh() > closesAbove) );
    }

    findLow(maxCandlesBack,closesBelow) {
        if (! this.lastCandle ) { return null; }
        const fromTime = this.getTimeCandlesBack(this.lastCandle,maxCandlesBack);
        return this.lows.find( c => (c.openTime > fromTime) && (c.bodyLow() < closesBelow) );        
    }


    getTimeCandlesBack(candle,num)
    {
        return candle.openTime - TF.getCandleTimeframeLength(candle)*num;
    }
 
    /* rotation. we must remove all events/flags with time equal or below */
    forgetBefore(time) {
        this.highs = this.highs.filter( c => c.openTime > time );
        this.lows = this.lows.filter( c => c.openTime > time );
    }

}

module.exports = PrevSwing;