class Timeframes {
  DAY_LENGTH = 24 * 60 * 60000;
  MIN_LENGTH = 60000;
  HOUR_LENGTH = this.MIN_LENGTH * 60;

  // prettier-ignore
  TFRAMES = [
        { name: '1w',  htf: null,  levelDays: 365, limit: 300,  trade: false, levelsLimitTime: 0, length: 7 * this.DAY_LENGTH },
        { name: '1d',  htf: '1w',  levelDays: 365, limit: 300,  trade: false, levelsLimitTime: 0, length: this.DAY_LENGTH },
        { name: '4h',  htf: '1d',  levelDays: 122, limit: 300,  trade: false, levelsLimitTime: 0, length: 4 * this.HOUR_LENGTH },
        { name: '1h',  htf: '4h',  levelDays:  41, limit: 300,  trade: false, levelsLimitTime: 0, length: 1 * this.HOUR_LENGTH },
        { name: '30m', htf: '4h',  levelDays:  17, limit: 300,  trade: false, levelsLimitTime: 0, length: 30 * this.MIN_LENGTH },
        { name: '15m', htf: '1h',  levelDays:   7, limit: 300,  trade: false, levelsLimitTime: 0, length: 15 * this.MIN_LENGTH },
        { name: '5m',  htf: '1h',  levelDays:   5, limit: 300,  trade: false, levelsLimitTime: 0, length: 5 * this.MIN_LENGTH },
        { name: '3m',  htf: '1h',  levelDays:   2, limit: 300,  trade: false, levelsLimitTime: 0, length: 3 * this.MIN_LENGTH },
        { name: '1m',  htf: '1h',  levelDays:   1, limit: 300,  trade: false, levelsLimitTime: 0, length: 1 * this.MIN_LENGTH, pulseOnly: true },
    ];

  constructor() {
    this.TFRAMES.forEach((tf) => {
      //tf.limit = Math.floor( (tf.days * this.DAY_LENGTH) / tf.length );
      tf.levelsLimitTime = tf.levelDays * this.DAY_LENGTH;
    });
  }

  getSmallest() {
    return this.TFRAMES[this.TFRAMES.length - 1];
  }

  get(timeframe) {
    return this.TFRAMES.find((t) => t.name == timeframe);
  }

  getHigherTimeframe(timeframe) {
    return this.get(timeframe).htf;
  }

  getLevelLimitTime(timeframe) {
    return this.get(timeframe).levelsLimitTime;
  }

  getTimeframeLength(timeframe) {
    return this.get(timeframe).length;
  }

  getCandleTimeframeLength(candle) {
    return this.TFRAMES.find((tf) => tf.name === candle.timeframe).length;
  }

  checkCandleShorter(candle) {
    return (
      candle.openTime + this.getCandleTimeframeLength(candle) >=
      candle.closeTime - 1
    );
  }
}

const TF = new Timeframes();

module.exports = { TF };
