class Magnet {
  static TYPES = Object.freeze({ IMBALANCE: 'im', ORDERBLOCK: 'ob' });

  constructor(price, weight, candle, id, type) {
    this.price = price;
    this.weight = weight;
    this.candle = candle;
    this.type = type;
    this.id = id;
  }
  getId() {
    return this.id;
  }
  inRange(y0, y1) {
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
  getType() {
    return this.type;
  }
}

module.exports = Magnet;
