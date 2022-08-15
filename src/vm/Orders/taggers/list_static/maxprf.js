/*
** MAX PROFIT AND LOSS
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 
const { fnum } = require('../../../../reports/helper');

class MAXPRF extends Tagger {
   
    

    getTagsDescription() { return [
        {
            name: 'MAXPRF',
            vals: [],
            desc: 'Shows maximum price percent increase on takeProfit'
        },
        {
            name: 'MAXLSS',
            vals: [],
            desc: 'Shows price percent loss on stopLoss'
        },
    ]}

    calcGainPercent(isLong, entryPrice, dstPrice)
    {
        let gainPercent = 0;

        if (isLong ) {
            gainPercent = ((dstPrice - entryPrice) / entryPrice)*100;
        } else { // sell
            gainPercent = ((entryPrice - dstPrice) / entryPrice)*100
        }
        return gainPercent;
    }

    getStaticTags(entry, flags, entries, tags) // return if entry should pass
    {
        let res = {};

        const profitPreview = this.calcGainPercent( (entry.type=='buy'),
            entry.entryPrice,entry.takeProfit);

        res.MAXPRF = { value: fnum(profitPreview,3) };

        const lossPreview = this.calcGainPercent( (entry.type=='buy'),
            entry.entryPrice,entry.stopLoss); 

        res.MAXLSS = { value: fnum(lossPreview,3) };

        return res;
    }

}


module.exports = MAXPRF;

