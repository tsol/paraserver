/*
   
*/

const Tagger = require('../types/Tagger'); 


class CUSTOM5 extends Tagger {

    getTags(o, flags, orders, tags) 
    {
        let res = 'N';
        if (
            ( (o.strategy.startsWith('tpcwfma'))&&(o.timeframe=='1h')&&(tags.MACDF.value=='P')&&(tags.MAXPRF.value>1.8) )
        ||	( (o.strategy.startsWith('cma'))&&(o.timeframe=='1h')&&(tags.MACDF.value=='P')&&(tags.MAXPRF.value>3) )
        //||	( (o.strategy.startsWith('ttcwoff'))&&(o.timeframe=='15m')&&(tags.MACDF.value=='P')&&(tags.MAXPRF.value>2.1) ) 
        
        ) {
            res = 'Y';
        }

        return {
            CU5: { value: res }
        }

    }

}

module.exports = CUSTOM5;

