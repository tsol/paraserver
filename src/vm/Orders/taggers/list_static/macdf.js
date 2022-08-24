/*
** MACD FLAG PREVENT BUY OR SELL
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class MACDF extends Tagger {
    

    getTagsDescription() { return [
        {
            name: 'MACDF',
            vals: ['P','F'],
            desc: 'Filters (F) buy entries when MACD histogram line switched below ZERO, less '+
                  'than 3 candles ago. And vice-versa for sell entries.'
        },
    ]}

    getStaticTags(entry, flags, entries) // return if entry should pass
    {
        const macdf = flags.get('macdf');
        if (! macdf ) { return; }

        let filterResult = 'P';

        if (macdf.r == 'db') {
            if (entry.type == 'buy')
                { filterResult = 'F'; }
        }
        else if (macdf.r == 'ds') {
            if (entry.type == 'sell')
                { filterResult = 'F'; }
        }
 
        return { MACDF: { value: filterResult } };
    }

}


module.exports = MACDF;

