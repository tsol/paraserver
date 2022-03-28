const { TF } = require('../../../types/Timeframes.js');

class BFPG {

    constructor() {
        this.reset();
        this.tags = {};
    }

    reset() {
    }
 
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const hrs = [1,2,3,6];
        this.tags = {};

        hrs.forEach( (h) => {
            let bhf = this.makeTag( h, order, orders, '_F' );
            let bhp = this.makeTag( h, order, orders, '_P' );

            this.tags[ h+'hgbf' ] = bhf;
            this.tags[ h+'hgbp' ] = bhp;

            let winner = 'F';

            if (   (bhp.ratio > bhf.ratio)
                && (bhp.num >= 10)
                && ( (bhp.gain > 0) && (bhp.gain > bhf.gain))
            ) {
                winner = 'P';
            }

            this.tags[ h+'hgbw' ] = { value: winner };

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
        const ratio = calcWinLooseRatio( res.win, res.lost );

        let yes = 'N';
        if ( (num > 16) && (gain > 0) ) { yes = 'Y'; };

        return {   value: yes,
                   comment: num+'='+ratio.toFixed(2)+'/'+gain.toFixed(2)+'$',
                   num: num, gain: gain, ratio: ratio
        };
    }
 
}

function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}


module.exports = BFPG;

