/*
    CUSTOM strategies filter
*/

const STRA = {
    'cma3buy':      {},
    'dblbottom':    {},
    'macwfma':      { tags: { fp: '_F' } },
    'tpcwfma':      { order: { type: 'buy'}, tags: { fp: '_F' } } 
}


class CUSTOM {

    constructor() {
        this.reset();
    }

    reset() {
    }

    hourlyTick(order,flags,orders,hour) {
    }    
 

    getTags(order, flags, orders, tags) 
    {
    
        return {
            CU: { value: ( this.orderPass(order,tags) ? 'Y' : 'N') }
        }

        return newTags;
    }


    orderPass(order, tags)
    {
        const stra = STRA[ order.strategy ];
        if ( !stra )
            { return false; }
        
        if (stra.order) {

            for (var param in stra.order) {
                if ( order[ param ] !== stra.order[ param ])
                    { return false};
            }
        }

        if (stra.tags) {

            for (var param in stra.tags) {
                if ( ! tags[ param ])
                    { return false; }

                if ( tags[ param ].value !== stra.tags[ param ])
                    { return false };
            }
        }

        return true;
    }


}

module.exports = CUSTOM;

