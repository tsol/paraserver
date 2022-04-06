/*
** Exponential Moving Avarage
**
**
*/

class EMA {

    constructor (size) {
        this.size = size;
        this.items = [];
        this.prevEMA = null;
        this.multiplier = 2 / (size+1);
    }

    getEMA(currentValue) {

        if (this.prevEMA !== null)
        {
            // EMA = Closing price x multiplier + EMA (previous day) x (1-multiplier)
            const newEMA = currentValue * this.multiplier + this.prevEMA * (1-this.multiplier);
            this.prevEMA = newEMA;
            return newEMA;
        }

        if (this.items.length < this.size) {
            this.items.push(currentValue);
            
            const sum = this.items.reduce( (a,b) => a + b, 0 );
            const avg = sum / this.items.length;

            if (this.items.length === this.size) {
                this.prevEMA = avg;
            }

            return avg;
        }

        throw new Error('should not happen');

    }


}

module.exports = EMA;