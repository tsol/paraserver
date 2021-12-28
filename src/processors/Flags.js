/*
** Flags State storage. For every ticker (symbol-timeframe) contains current
** resulting flags from analyzers.
**
** Allows every ticker to request info from siblings and larger timeframes.
**
*/

const { TF } = require('../types/Timeframes.js');

class Flags {

    constructor() {
        this.tickers = {};
        this.currentSymbol = undefined;
        this.currentTimeframe = undefined;
    }

    start(symbol,timeframe) {
        this.currentSymbol = symbol;
        this.currentTimeframe = timeframe;
        this.tickers[ this.currentId() ] = {};
    }


    currentId() {
        return this.currentSymbol+'-'+this.currentTimeframe;
    }

    allFlags(tickerId) {
        return this.tickers[ tickerId ];
    }

    set(field, value) {
        this.tickers[ this.currentId() ][ field ] = value;
    }

    get(field) {
        return this.tickers[ this.currentId() ][ field ];
    }

    /* get Higher Time Frame flag. That way tickers can peek for flags of older brothers */
    getHTF(field) {
        const ntf = TF.next(this.currentTimeframe);
        if (ntf == undefined) {
            return undefined;
        }
        const t = this.tickers[ this.currentSymbol+'-'+ntf ];
        if (! t) { return undefined; }
        return t[ field ];
    }

    getTickers() {
        return this.tickers;
    }

    merge(anotherFlagObject) {
        const newTickers = anotherFlagObject.getTickers();
        for( var tid of Object.keys(newTickers)) {
            this.tickers[ tid ] = newTickers[ tid ];
        }
    }


}

module.exports = Flags;
