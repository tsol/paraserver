/*
** Flags State storage. For every ticker (symbol-timeframe) contains current
** resulting flags from analyzers.
**
** Allows every ticker to request info from siblings and larger timeframes.
**
*/

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

    getHTF(field) {
        const ntf = this.nextTF();
        if (ntf == undefined) {
            return undefined;
        }
        const t = this.tickers[ this.currentSymbol+'-'+ntf ];
        if (! t) { return undefined; }
        return t[ field ];
    }

    nextTF() {
        switch (this.currentTimeframe) {
            case '1m': return '15m';
            case '15m': return '1h';
            case '1h': return '1d';
        }
        return undefined;
    }

}


module.exports = Flags;
