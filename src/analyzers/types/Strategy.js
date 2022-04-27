/*
** This is interface and base class for every analyzer
** in list folder. All analyzers must extend from this class and
** implement all functions.
*/

const Analyzer = require("./Analyzer");

class Strategy extends Analyzer {

    getParams(timeframe) {
        return {
            statsMaxOrders: 30,
            statsOkRatio: 50
        };
    }
}

module.exports = Strategy;
