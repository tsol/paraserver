/*
** Margin call correction (stopLoss is below margin call)
*/

const Tagger = require('../types/Tagger'); 

class MCORRECT extends Tagger {
    
    getTagsDescription() { return [
        {
            name: 'MCO',
            vals: ['P','F'],
            desc: 'Pass (P) if possible loss at stopLoss is less than margincall.'
        }    
    ]}

    getDynamicTags(order, orders, activeOrders, entries, activeEntries, addedEntries, params, tags) 
    {
        let res = {};

        if (!(params.LEVERAGE>0)) {
            return { MCO: { value: 'P'} };
        } 

        const STOPLOSS_PERCENT = order.getTagValue("MAXLSS");

        if ( ! STOPLOSS_PERCENT ) {
            throw new Error('MAXPRF tagger required for MCORRECT');
        }

        res.MCO = { value: 'F' };

        const USD_IN_GAME = (order.quantity * order.entry.entryPrice);
        const REAL_USD_AT_STAKE = USD_IN_GAME / params.LEVERAGE;
        const USD_MAX_LOSS_AT_STOPLOSS = Math.abs(STOPLOSS_PERCENT / 100 * USD_IN_GAME); 

        //res.MCO.comment = 'uas='+REAL_USD_AT_STAKE+', uml='+USD_MAX_LOSS_AT_STOPLOSS;

        if (USD_MAX_LOSS_AT_STOPLOSS <= REAL_USD_AT_STAKE) {
            res.MCO.value = 'P';
            return res;
        } 

        return res;

        /* adjust precision

        let newStopLoss, newTakeProfit;
        
        [ newStopLoss, newTakeProfit ] = this.correctMarginCallSLTP(
            entry.entryPrice, (entry.type=='buy'), entry.stopLoss, entry.takeProfit,
            entry.quantity, -1*this.params.MARGINCALL_GAIN
        );

        try {        
            aligned = this.brokerCandles.getAlignedOrderDetails(symbol,entryPrice,
            this.params.STAKE_USD,newStopLoss,newTakeProfit);
            newStopLoss = aligned.stopLoss;
            newTakeProfit = aligned.takeProfit;
        } catch (e) {
            console.log("BAD ORDER PARAMS: "+e.message);
            return null;
        }

        res.MCO_SL = { value: entry.stopLoss+' => '+newStopLoss };

        */

    }

/*
    correctMarginCallSLTP(entryPrice, isLong, stopLoss, takeProfit, quantity, positiveTargetLoss)
    {
        const newStopLoss =
         this.calcTargetLossPrice(positiveTargetLoss, entryPrice, isLong, quantity);

        if (    (isLong && (newStopLoss <= stopLoss))
            || (!isLong && (newStopLoss >= stopLoss))
        ) { return [stopLoss, takeProfit]; }
     
        const ratio = Math.abs(entryPrice-newStopLoss) / Math.abs(entryPrice-stopLoss);
        const oldTakeHeight = entryPrice - takeProfit;
        const newTakeProfit = entryPrice - 1*oldTakeHeight*ratio;

        return [ newStopLoss, newTakeProfit ];
    }

    calcTargetLossPrice(positiveTargetLoss, entryPrice, isLong, quantity)
    {
        const z = ( isLong ? 1 : -1);
        const res = (( entryPrice * (z - this.params.COST_BUY_PERCENT) - positiveTargetLoss / quantity )
            / (this.params.COST_SELL_PERCENT + z));
        return res;
    }

*/

}


module.exports = MCORRECT;

