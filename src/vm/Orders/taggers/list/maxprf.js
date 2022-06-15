/*
** MAX PROFIT AND LOSS
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 
const { fnum } = require('../../../../reports/helper');

class MAXPRF extends Tagger {
    

    previewProfit(isLong, quantity, entryPrice, takeProfit)
    {
        const boughtInUSD = quantity * entryPrice;
        const soldInUSD = quantity * takeProfit;
        const commissionInUSD = soldInUSD * this.params.COST_SELL_PERCENT +
                                boughtInUSD * this.params.COST_BUY_PERCENT;
        let gain = 0;

        if (isLong ) {
            gain = soldInUSD - boughtInUSD - commissionInUSD;
        } else { // sell
            gain = boughtInUSD - soldInUSD - commissionInUSD;
        }
        return gain;
    }

    getTags(order, flags, orders, tags) // return if order should pass
    {
        let res = {};

        const profitPreview = this.previewProfit( (order.type=='buy'),
            order.quantity,order.entryPrice,order.takeProfit);

        res.MAXPRF = { value: fnum(profitPreview,3) };

        const lossPreview = this.previewProfit( (order.type=='buy'),
            order.quantity,order.entryPrice,order.stopLoss); 

        res.MAXLSS = { value: fnum(lossPreview,3) };

        return res;
    }

}


module.exports = MAXPRF;

