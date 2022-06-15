/*
** RSI FLAG (BUY OK IF rsi>50, SELL OK IF rsi<50)
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class RSI extends Tagger {
    
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const rsi = flags.get('rsi14');
        if (! rsi ) { return; }

        let filterResult = 'P';

        if (rsi < 50) {
            if (order.type == 'buy')
                { filterResult = 'F'; }
        }
        else if (rsi > 50) {
            if (order.type == 'sell')
                { filterResult = 'F'; }
        }
 
        return { RSI: { value: filterResult } };
    }

}


module.exports = RSI;

