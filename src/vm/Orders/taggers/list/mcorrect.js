/*
** Margin call correction (stopLoss is below margin call)
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 
const { fnum } = require('../../../../reports/helper');

const OrdersEmulator = require('../../OrdersEmulator');

class MCORRECT extends Tagger {
    
    getTags(order, flags, orders, tags)
    {
        let res = {};

        if ( !tags.MAXLSS ) {
            throw new Error('MAXPRF tagger required for MCORRECT');
        }

        if (tags.MAXLSS.value > this.params.MARGINCALL_GAIN) {
            return { MCORR: { value: 'N'} };
        } 

        let newStopLoss, newTakeProfit;
        
        [ newStopLoss, newTakeProfit ] = this.correctMarginCallSLTP(
            order.entryPrice, (order.type=='buy'), order.stopLoss, order.takeProfit,
            order.quantity, -1*this.params.MARGINCALL_GAIN
        );

        /* adjust precision
        try {        
            aligned = this.brokerCandles.getAlignedOrderDetails(symbol,entryPrice,
            this.params.STAKE_USD,newStopLoss,newTakeProfit);
            newStopLoss = aligned.stopLoss;
            newTakeProfit = aligned.takeProfit;
        } catch (e) {
            console.log("BAD ORDER PARAMS: "+e.message);
            return null;
        }
        */

        res.MCORR = { value: 'Y' };
        res.MCORR_SL = { value: order.stopLoss+' => '+newStopLoss };

        return res;
    }


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


    /* */
    calcTargetLossPrice(positiveTargetLoss, entryPrice, isLong, quantity)
    {
        const z = ( isLong ? 1 : -1);
        const res = (( entryPrice * (z - this.params.COST_BUY_PERCENT) - positiveTargetLoss / quantity )
            / (this.params.COST_SELL_PERCENT + z));
        return res;
    }



}


module.exports = MCORRECT;

