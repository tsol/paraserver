/*
** TREND
*/

const { TF } = require('../../../types/Timeframes.js');

class EMATREND {

    constructor(ema1,ema2,ema3) {
        this.reset();
        this.ema1 = ema1;
        this.ema2 = ema2;
        this.ema3 = ema3;
        this.name = 'ET'+(ema1+ema2+ema3);
    }

    reset() {
    }
 
    hourlyTick(order,flags,orders,hour) {
    }
 
    getTags(order, flags, orders, tags) // return if order should pass
    {
        let trend = 'NO';

        const e1 = flags.get('emac'+this.ema1);
        const e2 = flags.get('emac'+this.ema2);
        const e3 = flags.get('emac'+this.ema3);
        

        if ( (e1 > e2) && (e2 > e3)) {
            trend = 'UP';
        }

        if ( (e1 < e2) && (e2 < e3) ) {
            trend = 'DN';
        }

        const newTags = {};
        newTags[ this.name ] = { value: trend };

        return newTags;

    }
    
}


module.exports = EMATREND;

