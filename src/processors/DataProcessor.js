
const TickerProcessor = require('./TickerProcessor.js');

class DataProcessor {

    constructor() {
        this.tickers = {};
    }

    addTicker(symbol,timeframe,limit)
    {
        const ticker = new TickerProcessor(symbol,timeframe,limit);
        const tickerId = ticker.getId();
        this.tickers[tickerId] = ticker;
        console.log('adding ticker: '+tickerId);
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
