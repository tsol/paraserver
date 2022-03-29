const { TF } = require('../../../types/Timeframes.js');

class FPG_C2 {

    constructor(hours) {
        this.reset();
        this.hours = hours;
        this.name = 'C'+hours;
        this.winner = 'F';
        this.looser = 'P';
    }

    reset() {
    }

    switchWinner() {
        if (this.winner == 'F') {
            this.winner = 'P';
            this.looser = 'F';
        }
        else {
            this.winner = 'F';
            this.looser = 'P';
        }
    }
 
    getTags(order, flags, orders, tags) // return if order should pass
    {
        const calc = {
            F: this.makeTag( this.hours, order, orders, '_F' ),
            P: this.makeTag( this.hours, order, orders, '_P' )
        }

        const w = calc[ this.winner ];
        const l = calc[ this.looser ];

        let wasSwitch = false;

        if ( (l.ratio > w.ratio)
                && ( l.num >= 5 )
                && ( l.gain > 0 ) && ( l.gain > w.gain)
        ) {
            this.switchWinner();
            wasSwitch = true;
        }

        const passFilter = ( tags.fp.value == '_'+this.winner );

        const newTags = {};

        newTags[ this.name ] = {
            value: ( passFilter ? 'Y' : 'N'),
            comment: 'sw='+(wasSwitch ? 'y' : 'n')
                +' cw='+this.winner
                +' (F='+calc.F.comment
                +', P='+calc.P.comment+')'           
        };

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

        return {
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


module.exports = FPG_C2;

