/*
** Bitcoin trend, replies on analyzer BTCTREND, transforms flags into order tags
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class BTC extends Tagger {
    
    static SYMBOL       = 'BTCUSDT';
    static TIMEFRAMES   = ['1h','4h','1d'];
    static MA_PERIODS   = [9,20,200];

    getTags(order, flags, orders, tags) // return if order should pass
    {
        this.tags = {};

        BTC.TIMEFRAMES.forEach( tf => {
            BTC.MA_PERIODS.forEach( p => {
                this.createTag(order,flags,tf,p);
            })
        })

        return this.tags;

    }

    createTag(order,flags,timeframe,period) {

        const btcTrend = flags.getTickerFlag(
            BTC.SYMBOL+'-'+timeframe, 'bt-'+timeframe+'-'+period
        );

        const curBFP = this.getBFP(order.type,btcTrend);
        const PRE = 'BT-'+timeframe+'-'+period;

        this.tags[ PRE ] = {
            value: curBFP, n: btcTrend
        };
      
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


module.exports = BTC;