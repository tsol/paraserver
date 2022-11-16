/*
** Bitcoin trend, replies on analyzer BTCTREND, transforms flags into entry tags
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class BTC extends Tagger {
    
    static SYMBOL       = 'BTCUSDT';
    static MA_PERIODS   = [9,20];

    getTagsDescription() { 
        let tags = [];
        BTC.MA_PERIODS.forEach( p => {

                tags.push({
                    name: 'BT'+p,
                    vals: ['P','F','N'],
                    desc: 'Pass (P) if '+BTC.SYMBOL+' is above (buy entries) or below (sell entries) '+
                    'EMA '+p+' on current timeframe, (F) otherwise. When not enough data returns (N).'
                })

        })
        return tags;
    }


    getStaticTags(entry, flags, entries) // return if entry should pass
    {
        let tags = {};

        BTC.MA_PERIODS.forEach( p => {
            let tagValue = this.createTag(entry,flags,entry.timeframe,p);
            if (tagValue) {
                tags['BT'+p] = { value: tagValue };
            }
        })

        return tags;

    }

    createTag(entry,flags,timeframe,period) {

        const btcTrend = flags.getTickerFlag(
            BTC.SYMBOL+'-'+timeframe, 'bt-'+timeframe+'-'+period
        );

        if (! btcTrend ) { return null; }

        const doFilter = (
            ( (btcTrend > 0) && (! entry.isLong ) ) ||
            ( (btcTrend < 0) && ( entry.isLong ) )
        );

        return ( doFilter ? 'F' : 'P');
    }

}


module.exports = BTC;