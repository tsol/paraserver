/*
 ** areas of value, autocentered ATR height
 **
 **
 */

const Analyzer = require('../types/Analyzer');

const { TF } = require('../../../types/Timeframes.js');

class AnVLevels extends Analyzer {
  constructor() {
    super();
    this.levels = [];
    this.levelId = 0;
  }

  getId() {
    return 'vlevels';
  }

  init(io) {
    io.require('hl_trend');
    io.require('hills');
    io.require('extremum');
  }

  addCandle(candle, io) {
    super.addCandle(candle, io);
    io.cdb().setSource(this.getId());

    /* cut levels from begining */
    const cutSince = candle.openTime - TF.getLevelLimitTime(candle.timeframe);
    this.forgetBefore(cutSince);

    const extremum = io.get('extremum');
    const atr = io.get('atr14');

    const hillLow = io.get('hills.new.low');
    if (hillLow) {
      this.addBounceLevel(
        true,
        hillLow.openTime,
        hillLow.low,
        atr,
        30,
        hillLow,
        io
      );
    }

    const hillHigh = io.get('hills.new.high');
    if (hillHigh) {
      this.addBounceLevel(
        false,
        hillHigh.openTime,
        hillHigh.high,
        atr,
        30,
        hillHigh,
        io
      );
    }

    let extremumCandle = io.get('hl_trend.new.high');
    if (extremumCandle) {
      this.addBounceLevel(
        false,
        extremumCandle.openTime,
        extremumCandle.high,
        atr,
        10,
        extremumCandle,
        io
      );
    }

    extremumCandle = io.get('hl_trend.new.low');
    if (extremumCandle) {
      this.addBounceLevel(
        true,
        extremumCandle.openTime,
        extremumCandle.low,
        atr,
        10,
        extremumCandle,
        io
      );
    }

    io.set('vlevels', this);
    io.set('vlevels_high', io.getHTF('vlevels'));
  }

  toJSON() {
    let levels = [];
    this.levels.forEach((l) => {
      if (l.isWorthy()) {
        levels.push(l.toJSON());
      }
    });
    return levels;
  }

  addBounceLevel(bounceUp, time, y, atr, weight, candle, io) {
    let wasFound = false;
    for (const l of this.levels) {
      if (l.inSearchLevel(y)) {
        l.addPoint(time, y, bounceUp, atr, weight, candle, io);
        wasFound = true;
      }
    }
    if (wasFound || weight < 30) {
      return;
    }
    this.levelId++;
    const newLevel = new Level(this.levelId);
    newLevel.addPoint(time, y, bounceUp, atr, weight, candle, io);
    this.levels.push(newLevel);
    if (bounceUp) {
      io.cdb().labelBottom(candle, 'NL=' + this.levelId);
    } else {
      io.cdb().labelTop(candle, 'NL=' + this.levelId);
    }
  }

  forgetBefore(time) {
    const countBefore = this.levels.length;
    this.levels = this.levels.filter((l) => l.forgetBefore(time));
  }

  /* Consumer functions. Probably better split this file to several: analyzer, types, consumer helpers */

  getLevels() {
    return this.levels;
  }

  getLevelsOlderThan(timestamp) {
    return timestamp
      ? this.levels.filter((lvl) => lvl.fromX < timestamp)
      : this.levels;
  }

  getLevelsInfo(levelsArray) {
    return levelsArray.reduce(
      (sum, level) => {
        return {
          resistWeight: sum.resistWeight + level.resistWeight,
          supportWeight: sum.supportWeight + level.supportWeight,
          levelIds: [...sum.levelIds, level.getId()],
          levels: [...sum.levels, level],
        };
      },
      { resistWeight: 0, supportWeight: 0, levelIds: [], levels: [] }
    );
  }

  getInfoAtPrice(levelsArray, price) {
    return this.getLevelsInfo(
      levelsArray.filter((lvl) => lvl.isPriceInLevel(price))
    );
  }

  getInfoAtRange(levelsArray, y0, y1) {
    return this.getLevelsInfo(
      levelsArray.filter((lvl) => lvl.isRangeIntersectsLevel(y0, y1))
    );
  }

  getBottomTouchWeights(candle, olderThan) {
    const levels = this.getLevelsOlderThan(olderThan);
    const info = this.getInfoAtPrice(levels, candle.low);

    return {
      rw: info.resistWeight,
      sw: info.supportWeight,
      ids: info.levelIds,
    };
  }

  getTopTouchWeights(candle, olderThan) {
    const levels = this.getLevelsOlderThan(olderThan);
    const info = this.getInfoAtPrice(levels, candle.high);

    return {
      rw: info.resistWeight,
      sw: info.supportWeight,
      ids: info.levelIds,
    };
  }

  findUpperTarget({
    startPrice,
    maxPrice,
    reqWTotal,
    reqWSupport,
    reqWResist,
  }) {
    let upperLowerEdge = 0;

    for (let lvl of this.levels) {
      let lowerEdge = lvl.getLowerEdge();

      if (lowerEdge > startPrice && lowerEdge < maxPrice) {
        if (reqWTotal && reqWTotal > lvl.totalWeight) continue;
        if (reqWSupport && reqWSupport > lvl.supportWeight) continue;
        if (reqWResist && reqWResist > lvl.resistWeight) continue;

        if (lowerEdge > upperLowerEdge) {
          upperLowerEdge = lowerEdge;
        }
      }
    }
    return upperLowerEdge;
  }

  exactPriceMatch(arrayOfPrices) {
    this.levels.forEach((lvl) => {
      arrayOfPrices.forEach((p) => {
        if (lvl.getPrices().includes(p)) {
          return p;
        }
      });
    });
    return null;
  }
}

class Level {
  constructor(id) {
    this.points = [];
    this.id = id;
    this.y0 = undefined;
    this.y1 = undefined;
    this.resY0 = undefined;
    this.resY1 = undefined;
    this.countResist = 0;
    this.countSupport = 0;
    this.fromX = 0;
    this.totalWeight = 0;
    this.supportWeight = 0;
    this.resistWeight = 0;
    this.prices = []; // all prices forming level cached here
  }

  addPoint(time, level, bounceUp, height, weight, candle, io) {
    const wasPoint = this.points.find((p) => p.time === time);
    if (wasPoint) {
      return;
    }

    const point = {
      time: time,
      level: level,
      bounceUp: bounceUp,
      height: height,
      weight: weight,
    };

    this.points.push(point);
    this.recalcLevel();

    const debugMsg = '[' + this.supportWeight + '/' + this.resistWeight + ']';

    if (bounceUp) {
      io.cdb().labelBottom(candle, debugMsg);
    } else {
      io.cdb().labelTop(candle, debugMsg);
    }
  }

  recalcLevel() {
    const count = this.points.length;
    let height = 0;
    let level = 0;
    this.countResist = 0;
    this.countSupport = 0;
    this.fromX = this.points[0].time;
    this.totalWeight = 0;
    this.supportWeight = 0;
    this.resistWeight = 0;
    this.prices = [];

    this.points.forEach((p) => {
      height += p.height;
      level += p.level;
      this.totalWeight += p.weight;
      this.prices.push(p.level);
      if (p.bounceUp) {
        this.countSupport++;
        this.supportWeight += p.weight;
      } else {
        this.countResist++;
        this.resistWeight += p.weight;
      }
    });

    const yMiddle = level / count;
    const avgHeight = height / count;

    this.y0 = yMiddle - avgHeight / 2;
    this.y1 = yMiddle + avgHeight / 2;

    this.resY0 = yMiddle - avgHeight / 4;
    this.resY1 = yMiddle + avgHeight / 4;
  }

  forgetBefore(time) {
    const countBefore = this.points.length;
    this.points = this.points.filter((p) => p.time > time);

    if (this.points.length <= 0) {
      return false;
    }

    if (countBefore > this.points.length) {
      this.recalcLevel();
    }

    return true;
  }

  toJSON() {
    return {
      i: this.id,
      y0: this.resY0,
      y1: this.resY1,
      r: this.countResist,
      s: this.countSupport,
      rW: this.resistWeight,
      sW: this.supportWeight,
      x0: this.fromX,
      w: this.totalWeight,
      alpha: Math.min(0.8, this.totalWeight / 200),
    };
  }

  /* Consumer end */

  getId() {
    return this.id;
  }

  inSearchLevel(y) {
    if (this.y0 == undefined || this.y1 == undefined) return false;
    return y >= this.y0 && y <= this.y1;
  }

  getTotalWeight() {
    return this.totalWeight;
  }

  isWorthy() {
    return true;
  }

  isPriceInLevel(y) {
    if (this.resY0 === undefined || this.resY1 === undefined) return false;
    return y >= this.resY0 && y <= this.resY1;
  }

  isRangeIntersectsLevel(y0, y1) {
    if (this.resY0 === undefined || this.resY1 === undefined) return false;
    if (y0 > this.resY1 || y1 < this.resY0) return false;
    return true;
  }

  getLowerEdge() {
    return this.resY0;
  }

  getPrices() {
    return this.prices;
  }
}

module.exports = AnVLevels;
