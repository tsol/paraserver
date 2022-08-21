/*
** Simult entries
*/

const Tagger = require('../types/Tagger'); 

class SIMENTRY extends Tagger {
    
    getTagsDescription() { return [
        {
            name: 'SME',
            vals: ['P','F'],
            desc: ''
        }    
    ]}

    getDynamicTags(order, orders, activeOrders, entries,
        activeEntries, addedEntries, params, tags) 
    {
        let res = {};

        res.SME = { value: 'F' };

        return res;

    }


}


module.exports = SIMENTRY;

