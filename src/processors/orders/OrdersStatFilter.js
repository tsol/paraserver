
const BFP = require('./statfilters/bfp.js');
const HOURLY = require('./statfilters/hourly.js');

class OrdersStatFilter {

    constructor() {
        this.bfp = new BFP();
        this.hourly = new HOURLY();
    }

    reset() {
        this.bfp.reset();
        this.hourly.reset();
    }
 
    getTags(order, flags, orders)
    {
        // merge flags from different stat Filters
        return {
             ... this.bfp.getTags(order,flags,orders),
             ... this.hourly.getTags(order,flags,orders)
        }

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

