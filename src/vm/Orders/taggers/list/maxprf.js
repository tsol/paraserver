/*
** MAX PROFIT AND LOSS
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 
const { fnum } = require('../../../../reports/helper');

class MAXPRF extends Tagger {
    
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

    getTags(order, flags, orders, tags) // return if order should pass
    {
        let res = {};

        const profitPreview = this.calcGainPercent( (order.type=='buy'),
            order.entryPrice,order.takeProfit);

        res.MAXPRF = { value: fnum(profitPreview,3) };

        const lossPreview = this.calcGainPercent( (order.type=='buy'),
            order.entryPrice,order.stopLoss); 

        res.MAXLSS = { value: fnum(lossPreview,3) };

        return res;
    }

}


module.exports = MAXPRF;

