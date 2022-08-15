/*
** HOFFMAN TREND
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class HOS extends Tagger {
    
    static BTCSYMBOL    = 'BTCUSDT';
    static TIMEFRAMES   = ['1h','4h','1d'];


    getTagsDescription() { 
        let tags = [];

        HOS.TIMEFRAMES.forEach( tf => {

            tags.push({
                name: 'HT-'+tf,
                vals: ['P','F','N'],
                desc: 'Pass (P) if '+HOS.BTCSYMBOL+' is in uptrend (buy entries) or downtrend (sell entries) '+
                ' determined by Hoffman MA method on '+tf+' timeframe, fail (F) otherwise. When not enough data returns (N).'
            })

            tags.push({
                name: 'HTB-'+tf,
                vals: ['P','F','N'],
                desc: 'Pass (P) if entries symbol is in uptrend (buy entries) or downtrend (sell entries) '+
                ' determined by Hoffman MA method on '+tf+' timeframe, fail (F) otherwise. When not enough data returns (N).'
            })


        })
        return tags;
    }

    
    getStaticTags(entry, flags, entries, tags)
    {
        this.tags = {};

        HOS.TIMEFRAMES.forEach( tf => {
                this.createTag(entry,flags,HOS.BTCSYMBOL,tf);
                this.createTag(entry,flags,entry.symbol,tf);
        })

        return this.tags;

    }

    createTag(entry,flags,symbol,timeframe) {

        const hosTrend = flags.getTickerFlag(
            symbol+'-'+timeframe, 'hos'
        );

        const fp = this.getFPN(entry.type,hosTrend);

        let PRE = 'HT';
        if (symbol == HOS.BTCSYMBOL)
            { PRE = 'HTB'; }            
        if (timeframe !== entry.timeframe)
            { PRE += '-'+timeframe; }

        this.tags[ PRE ] = { value: fp };
    }


    getFPN(entryType, hosTrend)
    {
        if (!hosTrend || hosTrend == 'N') { return 'N'; }

        const doFilter = (
             ( (hosTrend == 'UP') && (entryType == 'sell') ) ||
             ( (hosTrend == 'DN') && (entryType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }
    
}


module.exports = HOS;