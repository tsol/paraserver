/*
** Margin call correction (stopLoss is below margin call)
*/

const Tagger = require('../types/Tagger'); 

class MCORRECT extends Tagger {
    
    getTagsDescription() { return [
        {
            name: 'MCO',
            vals: ['Y','N'],
            desc: 'True (Y) if maximum possible loss is more than stopLoss (margin call happens before stopLoss)'
        }    
    ]}

    getDynamicTags(order, orders, activeOrders, entries, activeEntries, params, tags) 
    {
        let res = {};

        const STOPLOSS_PERCENT = order.getTagValue("MAXLSS");

        if ( ! STOPLOSS_PERCENT ) {
            throw new Error('MAXPRF tagger required for MCORRECT');
        }
/*
        static PARAMS = {
            START_SUM:              { def: 1000 },       // usd
            STAKE_MODE:             { def: 'fixed' },    // fixed, percent
            STAKE_PERCENT:          { def: 0.05 },       // stake = DEPOSIT * STAKE_PERCENT      
            SIMULT_RISK_PERCENT:    { def: 0.1 },        // DEPOSIT * SIMULT_RISK = how many USD in risk in a moment
            STAKE_FIXED:            { def: 5 },          // in USD
            LEVERAGE:               { def: 20 },         // x Leverage
            COST_BUY_PERCENT:       { def: 0.0004 },     // 4 cents from every 100 dollars
            COST_SELL_PERCENT:      { def: 0.0004 },      // 0.04 % taker comission
    
            TAGS:                   { def: null },
            SYMBOLS:                { def: null },
            STRATEGIES:             { def: null },
            TIMEFRAMES:             { def: null },
            JSCODE:                 { def: null }
        };
*/
 
        const REAL_USD_AT_STAKE = params.STAKE_FIXED;
        const USD_IN_GAME = params.STAKE_FIXED * params.LEVERAGE;
        const USD_MAX_LOSS = Math.abs(STOPLOSS_PERCENT / 100 * USD_IN_GAME); 

        if (REAL_USD_AT_STAKE < USD_MAX_LOSS) {
            return { MCO: { value: 'N'} };
        } 
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

        res.MCO = { value: 'Y' };

        return res;
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

