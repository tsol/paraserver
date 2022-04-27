const { TF } = require('../../../types/Timeframes.js');
const { winRatio } = require('../../../reports/helper');
const Tagger = require('./types/Tagger');

class GD100 extends Tagger {

    static NUM_ORDERS       = 150;
    static GAIN_PER_ORDER   = 0.1;
    static MIN_RATIO        = 44;

    constructor() {
        this.reset();
        this.allow = [];
    }

    reset() {
    }
    
    monthlyTick(order,flags,orders,month) {
 
        const spl = {};
        const bo = orders.sort( (a,b) => b.time > a.time );
   
        bo.forEach( (o) => {
            let key = o.symbol+'-'+o.strategy;
            
            if (! spl[ key ]) { spl[ key ] = []; }

            if (! o.active && (spl[key].length < GD100.NUM_ORDERS)) {
                spl[key].push(o);
            }

        });

        this.allow = [];

        Object.keys(spl).forEach( (k) => {
            if (spl[k].length >= GD100.NUM_ORDERS) {
                let res = this.calc(spl[k]);

                if ( res.gain / res.num >= GD100.GAIN_PER_ORDER ) {
                    if ( res.ratio >= GD100.MIN_RATIO ) {
                        this.allow.push(k);
                    }
                }

            }
        });



    }

    calc( orders ) {

        const res = orders.reduce( (t, order) => { 
                t.gain += order.gain;
                if ( order.gain > 0 ) { t.win++ } else { t.lost++ };
                return t;
        }, { gain: 0, win: 0, lost: 0 });

        const gain  = res.gain;
        const num   = orders.length;
        const ratio = winRatio( res.win, res.lost );
     
        return {
            num: num, gain: gain, ratio: ratio
        };

    }

   
    getTags(order, flags, orders, tags) 
    {
    
        return {
            GD: { value: ( this.orderPass(order,tags) ? 'Y' : 'N') }
        }

        return newTags;
    }


    orderPass(order, tags)
    {
        const key = order.symbol+'-'+order.strategy;
        return this.allow.includes(key);
    }
    


}


module.exports = GD100;

