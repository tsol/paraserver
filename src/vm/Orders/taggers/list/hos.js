/*
** HOFFMAN TREND
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class HOS extends Tagger {
    
    static BTCSYMBOL    = 'BTCUSDT';
    static TIMEFRAMES   = ['1h','4h','1d'];

    getTags(order, flags, orders, tags)
    {
        this.tags = {};

        HOS.TIMEFRAMES.forEach( tf => {
                this.createTag(order,flags,HOS.BTCSYMBOL,tf);
                this.createTag(order,flags,order.symbol,tf);
        })

        return this.tags;

    }

    createTag(order,flags,symbol,timeframe) {

        const hosTrend = flags.getTickerFlag(
            symbol+'-'+timeframe, 'hos'
        );

        const fp = this.getFPN(order.type,hosTrend);

        let PRE = 'HT';
        if (symbol == HOS.BTCSYMBOL)
            { PRE = 'HTB'; }            
        if (timeframe !== order.timeframe)
            { PRE += '-'+timeframe; }

        this.tags[ PRE ] = { value: fp };
    }


    getFPN(orderType, hosTrend)
    {
        if (!hosTrend || hosTrend == 'N') { return 'N'; }

        const doFilter = (
             ( (hosTrend == 'UP') && (orderType == 'sell') ) ||
             ( (hosTrend == 'DN') && (orderType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }
    
}


module.exports = HOS;