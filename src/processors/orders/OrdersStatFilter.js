
const BFP = require('./statfilters/bfp.js');
const EMATREND = require('./statfilters/ematrend.js');

//const FPG_B = require('./statfilters/fpg-b.js');
//const FPG_H = require('./statfilters/fpg-h.js');
//const FPG_C2 = require('./statfilters/fpg-c2.js');
//const FP_SYMBOL = require('./statfilters/fp-symbol.js');
//const CUSTOM = require('./statfilters/custom.js');
//const CUSTOM2 = require('./statfilters/custom2.js');
//const CUSTOM3 = require('./statfilters/custom3.js');
//const GD100 = require('./statfilters/gd100.js');
//const FPG_C = require('./statfilters/fpg-c2.js');
//const HOURLY = require('./statfilters/hourly.js');

class OrdersStatFilter {

    constructor() {
        this.previousHour = null;

 
        this.filters = [
            new BFP(),
            new EMATREND(20,50,200)
        ];

        /*
        const hrs = [2,6,12];
        hrs.forEach( (h) => {
            this.filters.push( new FPG_C2(h) );
        })
*/

    }

    reset() {
        this.filters.forEach( f => f.reset() );
    }
 
    getTags(order, flags, orders)
    {
        let tags = {};

        const now = new Date(order.time);
        const hour = now.getHours();

        if (this.previousHour !== hour) {
            this.previousHour = hour;

            this.filters.forEach( f => {
                f.hourlyTick(order,flags,orders,hour);
            });
    
        }

        this.filters.forEach( f => {
            tags = { ... tags, ... f.getTags(order,flags,orders,tags) };
        });

        return tags;
    }


}

module.exports = OrdersStatFilter;

