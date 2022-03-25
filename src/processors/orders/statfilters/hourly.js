const { TF } = require('../../../types/Timeframes.js');

class HOURLY {

    constructor() {
        this.reset();
        this.tags = {};
    }

    reset() {
    }
 
    getTags(order, flags, orders) // return if order should pass
    {
        const hrs = [1,3,6,9,12,24,48,96,168];
        this.tags = {};

        hrs.forEach( (h) => {
            this.tags[ h+'h' ] = this.makeTag( h, order, orders )
        });

        let master = 'N';
/*
        if ( this.is(168) && this.is(96)  &&
            ( this.is(1) || this.is(3) || this.is(6) )
        ) { master = 'Y'; }
*/
        const weekly = this.tags[ '168h' ];
        const daily = this.tags[ '24h' ];

        if ( (weekly.num >= 14) && (weekly.ratio > 42.5) && ( daily.gain > 3) ) {
            master = 'Y';
        }

        this.tags.HR = { value: master };
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

    makeTag( hours, order, orders ) {
        const since = order.time - hours * TF.HOUR_LENGTH;
    
        let fOrders = orders.filter( (o) => {
            return ( o.time > since )
                &&  ( o.symbol == order.symbol )
                &&  ( o.timeframe == order.timeframe )
                &&  ( o.strategy == order.strategy ) ;
        });

        //console.log('FORDERS:');
        //console.log(fOrders);

        const res = fOrders.reduce( (t, order) => { 
                t.gain+=order.gain;
                if (order.gain>0) {t.win++} else {t.lost++};
                return t;
        }, { gain: 0, win: 0, lost: 0 });

        const gain = res.gain;
        const num = fOrders.length;
        const ratio = calcWinLooseRatio( res.win, res.lost );

        let yes = 'N';
        //if (num <= 0 && hours < 6) { yes = 'Y'; }
        if ( gain / hours > 0.05 ) { yes = 'Y'; };

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


module.exports = HOURLY;

