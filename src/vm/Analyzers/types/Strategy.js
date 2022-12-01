/*
 ** This is interface and base class for every analyzer
 ** in list folder. All analyzers must extend from this class and
 ** implement all functions.
 */

const Analyzer = require('./Analyzer');
const EntryFinder = require('./EntryFinder');

class Strategy extends Analyzer {
  constructor() {
    super();
    this.entryFinders = [];
    this.maxEntryFinderId = 0;
  }

  init(io) {
    this.io = io;
  }

  // overwrite this to return your own finder class extended from EntryFinder
  finderFactory(id, startCandle, isLong, params) {
    return new EntryFinder(id, startCandle, isLong, this.io, params);
  }

  _nextFinderId() {
    if (++this.maxEntryFinderId > 99) this.maxEntryFinderId = 1;
    return this.maxEntryFinderId;
  }

  newFinder(isLong, startCandle, currentCandle, params) {
    const exists = this.entryFinders.find(
      (f) => f.isLong === isLong && f.startCandle === startCandle
    );

    if (exists) return null;

    const newFinder = this.finderFactory(
      this._nextFinderId(),
      startCandle,
      isLong,
      params
    );

    const sinceCandles = this.io.getCandlesFrom(startCandle.closeTime);

    for (var c of sinceCandles) {
      if (c !== currentCandle) {
        const res = newFinder.addCandle(c);
        if (res === null || (res && res.entry)) {
          // while catching up with current time our finder died or found an entry
          // we only need entries in main loop - with fresh candles.
          return null;
        }
      }
    }

    this.entryFinders.push(newFinder);
    return newFinder;
  }

  runFinders(candle) {
    let findersRemove = [];
    let entriesFound = [];

    for (var finder of this.entryFinders) {
      const res = finder.addCandle(candle);
      if (res === null) {
        findersRemove.push(finder);
      } else if (res.entry) {
        entriesFound.push(res.entry);
        findersRemove.push(finder);
      }
    }

    this.entryFinders = this.entryFinders.filter(
      (f) => !findersRemove.includes(f)
    );
    return entriesFound;
  }
}

module.exports = Strategy;
