const { TF } = require('../../../../types/Timeframes.js');

class FPG_C {

    constructor() {
        this.reset();
    }

    reset() {
    }
 
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const hrs = [1,2,3,4,6,9,12];
        let newTags = {};

        hrs.forEach( (h) => {
            let bhf = this.makeTag( h, order, orders, '_F' );
            let bhp = this.makeTag( h, order, orders, '_P' );

            let winner = 'F';

            if (   (bhp.ratio > bhf.ratio)
                && (bhp.num >= 4)
                && ( (bhp.gain > 0) && (bhp.gain > bhf.gain))
            ) {
                winner = 'P';
            }


            newTags[ h+'C' ] = {
                value: ( tags.fp.value == '_'+winner ? 'Y' : 'N' ),

                comment: 'F:'+bhf.num+'='+bhf.ratio.toFixed(2)+'/'+bhf.gain.toFixed(2)+'$ '+ 
                         'P:'+bhp.num+'='+bhp.ratio.toFixed(2)+'/'+bhp.gain.toFixed(2)+'$ '

            }
            
        });

        return newTags;
    }

  
    makeTag( hours, order, orders, fp ) {
        const since = order.time - hours * TF.HOUR_LENGTH;
    
        let fOrders = orders.filter( (o) => {
            return ( o.time > since )
                && (o.tags.fp.value == fp)
                && (!o.active)
        });

        const res = fOrders.reduce( (t, order) => { 
                t.gain += order.gain;
                if ( order.gain > 0 ) { t.win++ } else { t.lost++ };
                return t;
        }, { gain: 0, win: 0, lost: 0 });

        const gain = res.gain;
        const num = fOrders.length;
        const ratio = calcWinLooseRatio( res.win, res.lost );

        return { num: num, gain: gain, ratio: ratio };
    }
 
}

function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}


module.exports = FPG_C

