
const BFP = require('./statfilters/bfp.js');
const BFPG = require('./statfilters/bfpg.js');
const HOURLY = require('./statfilters/hourly.js');

class OrdersStatFilter {

    constructor() {
        this.bfp = new BFP();
        this.hourly = new HOURLY();
        this.bfpg = new BFPG();
    }

    reset() {
        this.bfp.reset();
        this.hourly.reset();
        this.bfpg.reset();
    }
 
    getTags(order, flags, orders)
    {
        const bfp  = this.bfp.getTags(order,flags,orders, {});
        const bfpg = this.bfpg.getTags(order,flags,orders, bfp);  
 
        // merge flags from different stat Filters
        return {
             ... bfp,
             ... bfpg
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

