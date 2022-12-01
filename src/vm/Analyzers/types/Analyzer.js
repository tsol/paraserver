/*
 ** This is interface and base class for every analyzer
 ** in list folder. All analyzers must extend from this class and
 ** implement all functions.
 */

class Analyzer {
  constructor() {}

  /* should perform io.require(analyzer) */
  init(io) {}

  /* return analyzer string name */
  getId() {}

  /* analyze new completed candle */
  addCandle(candle, io) {}

  /* rotation. we must remove all events/flags with time equal or below */
  forgetBefore(time) {}

  toJSON() {
    return [];
  }

  // save/restore current state (counters etc) to store in JSON format
  stateToStore() {}
  stateFromStore(state) {}
}

module.exports = Analyzer;
