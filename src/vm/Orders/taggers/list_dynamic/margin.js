/*
** Margin call correction (stopLoss is below margin call)
*/

const Tagger = require('../types/Tagger'); 

class MARGIN extends Tagger {
    
    getTagsDescription() { return [
        {
            name: 'MRG',
            vals: ['P','F'],
            desc: 'Pass (P) if possible loss at stopLoss is less than margincall.'
        }    
    ]}

    getDynamicTags(order, orders, activeOrders, entries, activeEntries, addedEntries, params) 
    {
        let res = {};

        if (!(params.LEVERAGE>0)) {
            return { MRG: { value: 'P'} };
        } 

        const STOPLOSS_PERCENT = order.getTagValue("MAXLSS");

        if ( ! STOPLOSS_PERCENT ) {
            //throw new Error('MAXPRF tagger required for MARGIN');
            return res;
        }

        res.MRG = { value: 'F' };

        const USD_IN_GAME = (order.quantity * order.entry.entryPrice);
        const REAL_USD_AT_STAKE = USD_IN_GAME / params.LEVERAGE;
        const USD_MAX_LOSS_AT_STOPLOSS = Math.abs(STOPLOSS_PERCENT / 100 * USD_IN_GAME); 

        //res.MRG.comment = 'uas='+REAL_USD_AT_STAKE+', uml='+USD_MAX_LOSS_AT_STOPLOSS;

        if (USD_MAX_LOSS_AT_STOPLOSS <= REAL_USD_AT_STAKE) {
            res.MRG.value = 'P';
            return res;
        } 

        return res;

    }


}


module.exports = MARGIN;

