const Magnet = require('./magnet.js');

class Magnets {
  constructor(candleDebug) {
    this.magnets = [];
    this.cdb = candleDebug;
  }

  dbgParams(x1, weight) {
    return {
      x1,
      id: 'mgn',
      color: 'purple',
      alpha: 0.3 + 0.1 * weight,
      width: 2 + 0.5 * weight,
    };
  }

  add(price, weight, candle) {
    this.magnets.push(new Magnet(price, weight, candle));

    this.cdb.hline(candle, price, this.dbgParams(null, weight));
  }

  removeTouched(currentCandle) {
    const y0 = currentCandle.low;
    const y1 = currentCandle.high;

    const removeMagnets = [];

    this.magnets.forEach((magnet) => {
      if (magnet.crossRange(y0, y1)) {
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
        this.dbgParams(currentCandle.openTime, magnet.getWeight())
      );
    });
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

  getInfoAbove(price) {
    const res = this.getInfo(this.magnets.filter((m) => m.getPrice() > price));
    res.closestPrice = res.minPrice;
    res.farestPrice = res.maxPrice;
    return res;
  }

  getInfoBelow(price) {
    const res = this.getInfo(this.magnets.filter((m) => m.getPrice() > price));
    res.closestPrice = res.maxPrice;
    res.farestPrice = res.minPrice;
    return res;
  }
}

module.exports = Magnets;
