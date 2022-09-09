/*
    SOC - second opinion confirmation
    (P) if there is an simultanious entry from other strategy or timeframe
*/

const Tagger = require('../types/Tagger.js'); 

class SOC extends Tagger {
    
    getTagsDescription() { return [
        {
            name: 'SOC',
            vals: ['P','F'],
            desc: '(P) if there is an simultanious entry from another strategy'
        }    
    ]}

    getDynamicTags(order, orders, activeOrders, entries,
        activeEntries, addedEntries, params) 
    {
        let res = {};
        
        const otherEntries = addedEntries.filter( (e) => 
            (e.symbol === order.entry.symbol) && (e.strategy !== order.entry.strategy)
        );

        if (otherEntries.length > 0) {
            res.SOC = { value: 'P', comment: otherEntries.length };
        } else {
            res.SOC = { value: 'F' };
        }

        return res;

    }


}


module.exports = SOC;

