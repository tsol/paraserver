
const SymbolProcessor = require('./SymbolProcessor.js');
const Flags = require('./Flags.js');

class DataProcessor {

    constructor() {
        this.symbolProcessors = {};
        this.flags = new Flags();
    }

    addSymbol(broker, symbol)
    {
        if (this.symbolProcessors[ symbol ]) {
            return false;
        }
        const sp = new SymbolProcessor(broker,symbol,this.flags);
        this.symbolProcessors[symbol] = sp;
        console.log('DP: adding SYMBOL: '+symbol);
        return sp;
    }

    getTickerChart(symbol, timeframe) {
        return this.symbolProcessors[ symbol ].getTickerChart( timeframe );
    }

    getState() {

        return Object.keys(this.symbolProcessors)
            .reduce( (p, c) => { 
                    return [...p, ...this.symbolProcessors[c].getTickersState()]; 
            }, [] );
    }
    
    getCurrentPrice(symbol) {
        const t = this.symbolProcessors[ symbol ];
        if (! t) {
            console.error('cannot get current price of '+symbol);
            return 0;
        }
        return t.getCurrentPrice();
    }
}

module.exports = DataProcessor;
