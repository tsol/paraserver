
const { TF } = require('../../../types/Timeframes.js');
const { winRatio } = require('./helper.js');

class FPG_H {

    constructor() {
        this.reset();
        this.tags = {};
    }

    reset() {
    }


    hourlyTick(order,flags,orders,hour) {
    }
 
 
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const hrs = [1,2,3,4,6,9,12];
        this.tags = {};

        hrs.forEach( (h) => {
            let bhf = this.makeTag( h, order, orders, '_F' );
            let bhp = this.makeTag( h, order, orders, '_P' );

            this.tags[ h+'HF' ] = bhf;
            this.tags[ h+'HP' ] = bhp;

            let winner = 'F';

            if (   (bhp.ratio > bhf.ratio)
                && (bhp.num >= 10)
                && ( (bhp.gain > 0) && (bhp.gain > bhf.gain))
            ) {
                winner = 'P';
            }

            this.tags[ h+'H' ] = {
                value: ( tags.fp.value == '_'+winner ? 'Y' : 'N' )
            }
            
        });

        return this.tags;
    }

    is(hour) {
        return this.tags[ hour + 'h' ].value === 'Y';
    }

    ratio(hour) {
        return this.tags[ hour + 'h' ].ratio;
    }

    gain(hour) {
        return this.tags[ hour + 'h' ].gain;
    }

    makeTag( hours, order, orders, fp ) {
        const since = order.time - hours * TF.HOUR_LENGTH;
    
        let fOrders = orders.filter( (o) => {
            return ( o.time > since )
                && (o.tags.fp.value == fp);
        });

        const res = fOrders.reduce( (t, order) => { 
                t.gain+=order.gain;
                if (order.gain>0) {t.win++} else {t.lost++};
                return t;
        }, { gain: 0, win: 0, lost: 0 });

        const gain = res.gain;
        const num = fOrders.length;
        const wl_ratio = winRatio( res.win, res.lost );


        let yes = 'N';
        if ( (num > 16) && (gain > 0) ) { yes = 'Y'; };

        return {   value: yes,
                   comment: num+'='+wl_ratio.toFixed(2)+'/'+gain.toFixed(2)+'$',
                   num: num, gain: gain, ratio: wl_ratio
        };
    }
 
}


module.exports = FPG_H;

