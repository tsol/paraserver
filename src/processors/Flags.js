/*
** Flags State storage. For every ticker (symbol-timeframe) contains current
** resulting flags from analyzers.
**
** Allows every ticker to request info from siblings and larger timeframes.
**
** There is only one instance of this class in dataprocessor
** so analyzers of different timeframes or even symbols can access
** flags of every other timeframe or symbol
**
** Another instance, however, breifly created upon adding a bunch of new symbols
** to existing symbols in DataProcessor (inside of SymbolsLoader class).
** When loading finishes new temporarily flags object gets merged to primary one
** in DataProcessor.
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

    set(field, value) {
        this.tickers[ this.currentId() ][ field ] = value;
    }

    get(field) {
        return this.tickers[ this.currentId() ][ field ];
    }

    getAll() {
        return this.getAllFlagsByTickerId( this.currentId() );
    }

    getAllFlagsByTickerId(tickerId) {
        return this.tickers[ tickerId ];
    }

    getTickerFlag(tickerId,flag) {
        const ticker = this.tickers[ tickerId ];
        if (! ticker ) { return null; }
        return ticker[ flag ];
    }


    /* get Higher Time Frame flag. That way tickers can peek for flags of older brothers */
    getHTF(field) {
        const ntf = TF.getHigherTimeframe(this.currentTimeframe);
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
