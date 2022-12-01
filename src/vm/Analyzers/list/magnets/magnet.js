class Magnet {
  constructor(price, weight, candle) {
    this.price = price;
    this.weight = weight;
    this.candle = candle;
  }
  crossRange(y0, y1) {
    return y0 <= this.price && y1 >= this.price;
  }
  getCandle() {
    return this.candle;
  }
  getPrice() {
    return this.price;
  }
  getWeight() {
    return this.weight;
  }
}

module.exports = Magnet;
