/*
** This is interface and base class for every analyzer
** in list folder. All analyzers must extend from this class and
** implement all functions.
*/


class Analyzer {

    constructor() {
    }

    /* return analyzer string name */
    getId() {
    }

    /* analyze new completed candle */
    addCandle(candle, flags) {
    }

    /* rotation. we must remove all events/flags with time equal or below */
    forgetBefore(time) {
    }

    toJSON() {
        return [];
    }
  
}

module.exports = Analyzer;
