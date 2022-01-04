class Candle {

    constructor({ openTime, open, high, low, close, volume, closeTime, live, closed, symbol, timeframe }) {
        this.openTime = openTime;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
        this.closeTime = closeTime;
        this.visualDebug = [];
        this.live = live; /* false - candle historic load, true - fresh runtime new candle */
        this.closed = closed;
        this.symbol = symbol;
        this.timeframe = timeframe;
    }

    bodyLow()
    {
        return Math.min(this.open, this.close);
    }

    getId() {
        return this.symbol+'-'+this.timeframe+'-'+this.openTime;
    }

    isRed() {
        return this.open > this.close;
    }
    
    isGreen() {
        return this.open < this.close;
    }

    bodySize() {
        return Math.abs(this.open-this.close);
    }

    totalSize() {
        return Math.abs(this.high-this.low);
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
