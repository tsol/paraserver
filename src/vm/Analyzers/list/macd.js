/*
**  Moving Avarage Convergence Divergence (MACD)
**
**  by default sets a flag 'macd' with { m, s, h } data, where
**  m - macd value, s - signal value, h - histogram value
**
*/
const Analyzer = require("../types/Analyzer");

const EMA = require('../helpers/EMA.js');

class MACD extends Analyzer {

    static SLOW_LEN = 26;
    static FAST_LEN = 12;
    static SIGNAL_LEN = 9;

    constructor({slow,fast,signal,name}) 
    {
        super();
        this.slowEMA = new EMA(slow || MACD.SLOW_LEN);
        this.fastEMA = new EMA(fast || MACD.FAST_LEN);
        this.signalEMA = new EMA(signal || MACD.SIGNAL_LEN)
        this.name = ( name ? 'macd'+name : 'macd');
        this.prevHist = null;
    }

    getId() { return this.name; }

    addCandle(candle,io) {
        super.addCandle(candle,io);
        io.cdb().setSource(this.getId());

        const slow = this.slowEMA.getEMA(candle.close);
        const fast = this.fastEMA.getEMA(candle.close);
        const macd = fast - slow;
        const signal = this.signalEMA.getEMA(macd);
        const histogram = macd - signal;

        const histDiff = ( this.prevHist > histogram ? -1 : 
                ( this.prevHist < histogram ? 1 : 0));

        this.prevHist = histogram;

        const res = {
            m: macd,
            s: signal,
            h: histogram,
            d: histDiff 
        };

        io.cdb().onChart(candle, this.name, res);
        io.set(this.name, res);
    }
    
}

module.exports = MACD;

