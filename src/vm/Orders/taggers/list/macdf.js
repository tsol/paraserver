/*
** MACD FLAG PREVENT BUY OR SELL
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class MACDF extends Tagger {
    
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const macdf = flags.get('macdf');
        if (! macdf ) { return; }

        let filterResult = 'P';

        if (macdf.r == 'db') {
            if (order.type == 'buy')
                { filterResult = 'F'; }
        }
        else if (macdf.r == 'ds') {
            if (order.type == 'sell')
                { filterResult = 'F'; }
        }
 
        return { MACDF: { value: filterResult } };
    }

}


module.exports = MACDF;

