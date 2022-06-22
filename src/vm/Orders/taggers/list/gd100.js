const TH = require('../../../../helpers/time');
const { winRatio, orderStats } = require('../../../../reports/helper');
const Tagger = require('../types/Tagger');

class GD100 extends Tagger {

    static NUM_ORDERS       = 150;
    static GAIN_PER_ORDER   = 0.1;
    static MIN_RATIO        = 40;

    constructor() {
        super();
        this.allow = [];
        this.disallow = [];
    }
    
    weeklyTick(order,flags,orders,month) {
 
        const spl = {};
        const bo = orders.sort( (a,b) => b.time > a.time );
   
        bo.forEach( (o) => {
            let key = this.key(o);
            if (! spl[ key ]) { spl[ key ] = []; }
            if (! o.active && (spl[key].length < GD100.NUM_ORDERS)) {
                spl[key].push(o);
            }
        });

        this.allow = [];
        this.disallow = [];

        Object.keys(spl).forEach( (k) => {
            if (spl[k].length >= GD100.NUM_ORDERS) {
                let res = orderStats(spl[k]);

                if ((res.gain/res.num >= GD100.GAIN_PER_ORDER) && (res.ratio >= GD100.MIN_RATIO))
                {
                    this.allow.push(k);
                }
                else {
                    this.disallow.push(k);
                }
            }
        });

        console.log('GD100: TICK '+TH.ls(order.time));
        console.log(this.allow);
        console.log(this.disallow);

    }
 
    getTags(order, flags, orders, tags) 
    {
        return {
            GD: { value: ( this.isAllowed(order) ? 'Y' : 'N') },
            BD: { value: ( this.isDisallowed(order) ? 'Y' : 'N') }
        }
    }

    key(order) {
        return order.symbol+'-'+order.timeframe+'-'+order.strategy;
    }

    isAllowed(order)
    {
        return this.allow.includes(this.key(order));
    }
    
    isDisallowed(order)
    {
        return this.disallow.includes(this.key(order));
    }

}


module.exports = GD100;