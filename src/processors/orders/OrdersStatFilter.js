
const BFP = require('./statfilters/bfp.js');
const FPG_B = require('./statfilters/fpg-b.js');
const FPG_H = require('./statfilters/fpg-h.js');
const FPG_C2 = require('./statfilters/fpg-c2.js');
//const FPG_C = require('./statfilters/fpg-c2.js');

// const HOURLY = require('./statfilters/hourly.js');

class OrdersStatFilter {

    constructor() {

        const hrs = [1,2,3,4,6,9,12];

        this.filters = [
            new BFP(),
            new FPG_H(),
        ];

        hrs.forEach( (h) => {
            this.filters.push( new FPG_B(h) );
            this.filters.push( new FPG_C2(h) );

        })

    }

    reset() {
        this.filters.forEach( f => f.reset() );
    }
 
    getTags(order, flags, orders)
    {
        let tags = {};

        this.filters.forEach( f => {
            tags = { ... tags, ... f.getTags(order,flags,orders,tags) };
        });

        return tags;
    }

    tagsStringify(tagsObject)
    {
        let res = '';
        for (const tag in tagsObject) {
            res += ' '+tag+':'+tagsObject[tag].value+
                ( tagsObject[tag].comment ? ' ['+tagsObject[tag].comment+']' : '');
        }
        return res;         
    }


}



module.exports = OrdersStatFilter;

