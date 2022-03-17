/*
** This is interface and base class for every analyzer
** in list folder. All analyzers must extend from this class and
** implement all functions.
*/

const AnalyzerIO = require("./AnalyzerIO");

class StrategyIO extends AnalyzerIO {

    getParams(timeframe) {
        return {
            statsMaxOrders: 30,
            statsOkRatio: 50
        };
    }
}

module.exports = StrategyIO;
