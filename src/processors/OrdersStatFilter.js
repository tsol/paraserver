
const BFP = require('./statfilters/bfp.js');

class OrdersStatFilter {

    constructor() {
        this.bfp = new BFP();
    }

    reset() {
        this.bfp.reset();
    }
 
    passTrade(order, flags)
    {
          return this.bfp.passTrade(order,flags);
    }

    addTrade( order ) // add to statistics
    {
        this.bfp.addTrade(order);
        
    }

    getComment(order,flags)
    {
        return this.bfp.getComment(order,flags);
    }

}



module.exports = OrdersStatFilter;

