
const TickerProcessor = require('./TickerProcessor.js');
const Flags = require('./Flags.js');

class DataProcessor {

    constructor() {
        this.tickers = {};
        this.flags = new Flags();
    }

    addTicker(symbol,timeframe,limit)
    {
        const ticker = new TickerProcessor(symbol,timeframe,limit,this.flags);
        const tickerId = ticker.getId();
        this.tickers[tickerId] = ticker;
        console.log('DP: adding ticker: '+tickerId);
        return this.tickers[tickerId];
    }

    getChart(tickerId) {
        return this.tickers[tickerId].getChart();
    }

    getState() {
        return Object.keys(this.tickers).map( t => this.tickers[t].getState() );
    }
    

}

module.exports = DataProcessor;
