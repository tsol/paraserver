class CandleDebugEntry {
  constructor({ symbol, timeframe, time, entries }) {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.time = time;
    this.entries = entries || [];
  }

  addEntry(debugEntry) {
    if (debugEntry.id) {
      const foundIndex = this.entries.findIndex((e) => e.id === debugEntry.id);
      if (foundIndex >= 0) {
        this.entries[foundIndex] = debugEntry;
        return;
      }
    }

    this.entries.push(debugEntry);
  }

  toSTORE() {
    return {
      symbol: this.symbol,
      timeframe: this.timeframe,
      time: this.time,
      entries: this.entries,
    };
  }

  toGUI() {
    return {
      symbol: this.symbol,
      timeframe: this.timeframe,
      time: this.time,
      entries: this.entries,
    };
  }

  static fromSTORE(params = { symbol, timeframe, time, entries }) {
    params.entries = JSON.parse(params.entries);
    return new CandleDebugEntry(params);
  }
}

module.exports = CandleDebugEntry;
