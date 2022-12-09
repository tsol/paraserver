const Magnet = require('./magnet.js');

class Magnets {
  constructor(candleDebug) {
    this.magnets = [];
    this.cdb = candleDebug;
    this.maxId = 0;
  }

  dbgParams(x1, magnet) {
    return {
      x1,
      id: 'mgn' + magnet.getId(),
      color: magnet.getType() == Magnet.TYPES.IMBALANCE ? 'purple' : 'cyan',
      alpha: 0.3 + 0.1 * magnet.getWeight(),
      width: 2 + 0.5 * magnet.getWeight(),
    };
  }

  add(price, weight, candle, type) {
    const newMagnet = new Magnet(price, weight, candle, ++this.maxId, type);
    this.magnets.push(newMagnet);

    this.cdb.hline(candle, price, this.dbgParams(null, newMagnet));
  }

  removeTouched(currentCandle) {
    const y0 = currentCandle.low;
    const y1 = currentCandle.high;

    const removeMagnets = [];

    this.magnets.forEach((magnet) => {
      if (magnet.inRange(y0, y1)) {
        removeMagnets.push(magnet);
      }
    });

    if (removeMagnets.length > 0) {
      this.magnets = this.magnets.filter((m) => !removeMagnets.includes(m));
    }

    removeMagnets.forEach((magnet) => {
      this.cdb.hline(
        magnet.getCandle(),
        magnet.getPrice(),
        this.dbgParams(currentCandle.openTime, magnet)
      );
    });

    return removeMagnets.length;
  }

  getInfo(magnetsArray) {
    const start = {
      minPrice: Number.MAX_VALUE,
      maxPrice: Number.MIN_VALUE,
      weight: 0,
    };

    const res = magnetsArray.reduce((res, magnet) => {
      return {
        minPrice:
          magnet.getPrice() < res.minPrice ? magnet.getPrice() : res.minPrice,
        maxPrice:
          magnet.getPrice() > res.maxPrice ? magnet.getPrice() : res.maxPrice,
        weight: res.weight + magnet.getWeight(),
      };
    }, start);

    res.count = magnetsArray.length;
    return res;
  }

  getSince(timestamp) {
    return this.magnets.filter((m) => m.getCandle().openTime >= timestamp);
  }

  filterRange(y0, y1, magnetsArray) {
    const ma = magnetsArray || this.magnets;
    return ma.filter((m) => m.getPrice() >= y0 && m.getPrice() <= y1);
  }

  filterAbove(price, magnetsArray) {
    return magnetsArray.filter((m) => m.getPrice() > price);
  }

  filterBelow(price, magnetsArray) {
    return magnetsArray.filter((m) => m.getPrice() < price);
  }

  getInfoAbove(price) {
    const magnetsAbove = this.magnets.filter((m) => m.getPrice() > price);
    const res = this.getInfo(magnetsAbove);
    res.closestPrice = res.minPrice;
    res.farestPrice = res.maxPrice;
    res.recent = magnetsAbove.length > 0 ? magnetsAbove.at(-1) : null;
    return res;
  }

  getInfoBelow(price) {
    const magnetsBelow = this.magnets.filter((m) => m.getPrice() < price);
    const res = this.getInfo(magnetsBelow);
    res.closestPrice = res.maxPrice;
    res.farestPrice = res.minPrice;
    res.recent = magnetsBelow.length > 0 ? magnetsBelow.at(-1) : null;
    return res;
  }

  toJSON() {
    return {};
  }
}

module.exports = Magnets;
