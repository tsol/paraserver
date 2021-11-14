class AnalayzerIO {

    constructor() {
        this.flags = [];
    }

    /* analyze new completed candle */
    addCandle(candle, flags) {
    }

    /* rotation. we must remove all events/flags with time equal or below */
    forgetBefore(time) {
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
