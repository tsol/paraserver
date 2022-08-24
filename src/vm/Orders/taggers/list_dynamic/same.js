/*

    SAME - lets user to filter out secondary entering into same symbol
    if there are already active orders 

*/

const Tagger = require('../types/Tagger'); 

class SAME extends Tagger {
    
    getTagsDescription() { return [
        {
            name: 'SAME-SYM',
            vals: ['F','P'],
            desc: 'Pass (P) if there is no active orders with same symbol.'
        },
        {
            name: 'SAME-TF',
            vals: ['F','P'],
            desc: 'Pass (P) if there is no active orders with same symbol and timeframe.'
        },
        {
            name: 'SAME',
            vals: ['F','P'],
            desc: 'Pass (P) if there is no active orders with same symbol and timeframe and strategy.'
        },    
    ]}

    getDynamicTags(order, orders, activeOrders, entries,
        activeEntries, addedEntries, params) 
    {
        let res = {
            'SAME-SYM': { value: 'P' },
            'SAME-TF': { value: 'P' },
            'SAME': { value: 'P' },
        };

        if (activeOrders.length === 0) {
            return res;
        }

        const sameSymbolOrders = activeOrders.filter( 
            (o) => (o.entry.symbol === order.entry.symbol) );

        if (sameSymbolOrders.length > 0)
            { res['SAME-SYM'].value = 'F'; }

        const sameSymbolAndTimeframeOrders = sameSymbolOrders.filter(
            (o) => (o.entry.timeframe === order.entry.timeframe) );

        if (sameSymbolAndTimeframeOrders.length > 0)
            { res['SAME-TF'].value = 'F'; }

        const sameOrder = sameSymbolAndTimeframeOrders.find(
                (o) => (o.entry.strategy === order.entry.strategy) );
    
        if ( sameOrder )
                { res['SAME'].value = 'F'; }

        return res;

    }


}


module.exports = SAME;

