/*
** HOFFMAN TREND
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class HOT extends Tagger {
    
    static BTCSYMBOL    = 'BTCUSDT';

    getTagsDescription() { return [
        {
            name: 'HOT',
            vals: ['P','F','N'],
            desc: 'Pass (P) if entry direction is inline with Hoffman trend on current timeframe. '+
            '(N) when Hoffman trend shows no trend.'
        },
        {
            name: 'HOTB',
            vals: ['P','F','N'],
            desc: 'Pass (P) if entry direction is inline with Hoffman trend on ' + 
                HOT.BTCSYMBOL+' current timeframe. (N) when Hoffman trend shows no trend.'
        }
    ]}

    
    getStaticTags(entry, flags, entries)
    {
        let tags = {};

        const hotb = this.createTag(entry, flags, HOT.BTCSYMBOL, entry.timeframe);
        const hot  = this.createTag(entry, flags, entry.symbol, entry.timeframe);
  
        if ( hotb ) { tags.HOTB = { value: hotb }};
        if ( hot  ) { tags.HOT  = { value: hot  }};
        
        return tags;
    }

    createTag(entry, flags, symbol, timeframe) {

        const hosTrendFlag = flags.
            getTickerFlag( symbol+'-'+timeframe, 'hos');

        if (! hosTrendFlag ) { return null; };

        if ( hosTrendFlag == 'N') { return 'N'; }

        const doFilter = (
            ( (hosTrendFlag == 'UP') && (entry.type == 'sell') ) ||
            ( (hosTrendFlag == 'DN') && (entry.type == 'buy' ) )
        );
       
        return ( doFilter ? 'F' : 'P');
    }
    
}


module.exports = HOT;