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
        this.live = false; /* false - candle historic load, true - fresh runtime new candle */
    }

    isRed() {
        return this.open > this.close;
    }
    
    isGreen() {
        return this.open > this.close;
    }

    bodySize(candle) {
        return Math.abs(this.open-this.close);
    }

    lowerTailSize() {
        return (Math.min(this.open,this.close)-this.low);
    }

    upperTailSize() {
        return (this.high - Math.max(this.open,this.close));
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
