/*
** TREND
*/

const { TF } = require('../../../types/Timeframes.js');

class EMATREND {

    constructor(ema1,ema2,ema3) {
        this.reset();
        this.ema1 = ema1;
        this.ema2 = ema2;
        this.ema3 = ema3;
        this.name = 'ET'+(ema1+ema2+ema3);
    }

    reset() {
    }
 
    hourlyTick(order,flags,orders,hour) {
    }
 
    getTags(order, flags, orders, tags) // return if order should pass
    {

        const btcTrend = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        const curBFP = this.getBFP(order.type,btcTrend);

        let trend = 'NO';

        const e1 = flags.get('emac'+this.ema1);
        const e2 = flags.get('emac'+this.ema2);
        const e3 = flags.get('emac'+this.ema3);
        

        if ( (e1 > e2) && (e2 > e3)) {
            trend = 'UP';
        }

        if ( (e1 < e2) && (e2 < e3) ) {
            trend = 'DN';
        }

        const newTags = {};
        newTags[ this.name ] = { value: trend };

        return newTags;

    }


    getBFP(orderType, btcTrend)
    {
        if (!btcTrend) { return 'N'; }

        const doFilter = (
             ( (btcTrend > 0) && (orderType == 'sell') ) ||
             ( (btcTrend < 0) && (orderType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }
    
}


module.exports = EMATREND;

