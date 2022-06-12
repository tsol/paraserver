/*
* USDVOUME TAG
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 
const { fnum } = require('../../../../reports/helper');

class USDVOL extends Tagger {
    
    getTags(order, flags, orders, tags) // return if order should pass
    {
        let res = {};

        const c = order.candle;
        const u = c.volume * c.close;
        const l = TF.getTimeframeLength(c.timeframe);
        const h = 3600000;
        let r = 0;

        if (l < h ) { r = h/l * u; }
        else if (l > h) { r = u / (l/h); }
        else { r = u; }

        r = fnum(r / 1000, 3);

        res.USDVOL = { value: r };

        return res;
    }

}


module.exports = USDVOL;

