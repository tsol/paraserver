class AnalayzerIO {

    constructor() {
        this.flags = [];
    }

    addCandle(candle, flags) {
    }
    
    resetFlags() {
        this.flags = [];
    }

    getFlags() {
        return this.flags;
    }

    setFlag(flag,value) {
        this.flags[flag] = value;
    }

    reset() {
        this.resetFlags();
    }
}

module.exports = AnalayzerIO;
