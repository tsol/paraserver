class Candle {

    constructor({ openTime, open, high, low, close, volume, closeTime }) {
        this.openTime = openTime;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
        this.closeTime = closeTime;
        this.visualDebug = [];
    }

    isRed() {
        return this.open > this.close;
    }

    tailAbove(candle) {
        return (this.high > candle.high);
    }

    tailBelow(candle) {
        return (this.low < candle.low);
    }

    closeBelow(candle) {
        return (this.close < candle.low);
    }

    closeAbove(candle) {
        return (this.close > candle.high);
    }

}

module.exports = Candle;
