/*
** MAGIC F/P FLAG
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class BFP extends Tagger {
    
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const btcTrend = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        const curBFP = this.getBFP(order.type,btcTrend);

        const newTags = {
            fp: { value: '_'+curBFP },
            btc: { value: btcTrend }
        };

        return newTags;

    }


    getBFP(orderType, btcTrend)
    {
        if (!btcTrend) { return 'N'; }

        const doFilter = (
             ( (btcTrend > 0) && (orderType == 'sell') ) ||
             ( (btcTrend < 0) && (orderType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }
    
}


module.exports = BFP;

