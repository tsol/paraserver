
const BFP = require('./statfilters/bfp.js');
const FPG_B = require('./statfilters/fpg-b.js');
const FPG_H = require('./statfilters/fpg-h.js');

// const HOURLY = require('./statfilters/hourly.js');

class OrdersStatFilter {

    constructor() {

        this.filters = [
            new BFP(),
            new FPG_B(1),
            new FPG_B(2),
            new FPG_B(3),
            new FPG_B(4),
            new FPG_B(6),
            new FPG_H()
        ];

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

