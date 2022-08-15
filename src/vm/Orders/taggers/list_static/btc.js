/*
** Bitcoin trend, replies on analyzer BTCTREND, transforms flags into entry tags
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class BTC extends Tagger {
    
    static SYMBOL       = 'BTCUSDT';
    static TIMEFRAMES   = ['1h','4h','1d'];
    static MA_PERIODS   = [9,20,200];

    getTagsDescription() { 
        let tags = [];
        BTC.TIMEFRAMES.forEach( tf => {
            BTC.MA_PERIODS.forEach( p => {

                tags.push({
                    name: this.genTagName(tf,p),
                    vals: ['P','F','N'],
                    desc: 'Pass (P) if '+BTC.SYMBOL+' is above (buy entries) or below (sell entries) '+
                    ' EMA '+p+' on '+tf+' timeframe, fail (F) otherwise. When not enough data returns (N).'
                })

            })
        })
        return tags;
    }


    getStaticTags(entry, flags, entries, tags) // return if entry should pass
    {
        this.tags = {};

        BTC.TIMEFRAMES.forEach( tf => {
            BTC.MA_PERIODS.forEach( p => {
                this.createTag(entry,flags,tf,p);
            })
        })

        return this.tags;

    }

    genTagName(timeframe,period) {
        return 'BT-'+timeframe+'-'+period
    }

    createTag(entry,flags,timeframe,period) {

        const btcTrend = flags.getTickerFlag(
            BTC.SYMBOL+'-'+timeframe, 'bt-'+timeframe+'-'+period
        );

        const curBFP = this.getBFP(entry.type,btcTrend);
        const PRE = this.genTagName(timeframe,period);

        this.tags[ PRE ] = {
            value: curBFP, n: btcTrend
        };
      
    }

    getBFP(entryType, btcTrend)
    {
        if (!btcTrend) { return 'N'; }

        const doFilter = (
             ( (btcTrend > 0) && (entryType == 'sell') ) ||
             ( (btcTrend < 0) && (entryType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }
    
}


module.exports = BTC;