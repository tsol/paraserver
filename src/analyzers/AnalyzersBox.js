/*
** This is array of analyzer instances generated by AnalyzersFactory
** for TickerProcessor to process his candles.
*/

class AnalyzersBox {

    constructor(analyzersInstancesArray) {
        this.analyzers = analyzersInstancesArray;

    }

    addCandle(candle, flags, ordersManager) {
        this.analyzers.forEach( (analyzer) => {
            analyzer.addCandle(candle, flags, ordersManager);
        });
    }

    forgetBefore(timestamp)
    {
        this.analyzers.forEach( (analyzer) => {
            analyzer.forgetBefore(timestamp);
        });
    }

}

module.exports = AnalyzersBox;