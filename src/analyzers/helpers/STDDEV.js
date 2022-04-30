/*
** Standart Deviation
**
        // NOTE: this is equivalent to STDEVP excel function (NOT STDEV/STDEVA)
        // and exactly how TradingView calculates it.
        //
        // Investopedia however describes standart deviation where 'sumsq' 
        // needs to be devided by (n - 1) instead of (n) 
**
*/

class STDDEV {

    constructor (size) {
        this.size = size;
        this.items = [];
    }

    getSTDDEV(currentValue) {

        this.items.push(currentValue);

        if (this.items.length > this.size)
            { this.items.shift();}

        if (this.items.length < 1)
            { return 0; }

        const sum = this.items.reduce( (a,b) => a + b, 0 );
        const mean = sum / this.items.length;
        const sumsq = this.items.reduce( (a,b) => a + Math.pow(b-mean,2), 0 );
        const res = Math.sqrt( sumsq / (this.items.length) );
        

  
        return res;
    }

}

module.exports = STDDEV;