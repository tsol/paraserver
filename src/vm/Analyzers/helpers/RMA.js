/*
** Running (Rolling) Moving Avarage
**
**
*/


class RMA {

    constructor (size) {
        this.size = size;
        this.items = [];
        this.prevRMA = null;
    }

    getRMA(currentValue) {

        if (this.prevRMA !== null)
        {
            const newRMA = ( this.prevRMA * (this.size-1) + currentValue ) / this.size;
            this.prevRMA = newRMA;
            return newRMA;
        }

        if (this.items.length < this.size) {
            this.items.push(currentValue);
            
            const sum = this.items.reduce( (a,b) => a + b, 0 );
            const avg = sum / this.items.length;

            if (this.items.length === this.size) {
                this.prevRMA = avg;
            }

            return avg;
        }

        throw new Error('should not happen');

    }


}

module.exports = RMA;