/*
  EntryFinder is a worker process
 */

class EntryFinder {
  constructor(id, startCandle, isLong, io, params) {
    this.id = id;
    this.io = io;
    this.startCandle = startCandle;
    this.isLong = isLong;
    this.params = params;
  }

  // returns null, when finder is needed to be removed from parent array
  // returns { entry: { isLong } } parameters if entry is found; also can pass any
  // other parameter for io.makeEntry function.
  addCandle(candle) {}

  ltop(candle, label) {
    label = this.id + '.' + label;
    return this.isLong
      ? this.io.cdb().labelTop(candle, label)
      : this.io.cdb().labelBottom(candle, label);
  }

  lbot(candle, label) {
    label = this.id + '.' + label;
    return this.isLong
      ? this.io.cdb().labelBottom(candle, label)
      : this.io.cdb().labelTop(candle, label);
  }
}

module.exports = EntryFinder;
