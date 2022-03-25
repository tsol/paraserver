const { TF } = require('../../../types/Timeframes.js');

class BFP {

    static ANALYZE_TIME = 55 * TF.MIN_LENGTH; // period for analyze global BTC_FP TIME
    //static ANALYZE_TIME = 1 * TF.HOUR_LENGTH; // period for analyze global BTC_FP TIME

    constructor() {
        this.reset();
    }

    reset() {
        this.history = [];
        this.sum = {};
        this.sum.F = { gain: 0, rate: 0 };
        this.sum.P = { gain: 0, rate: 0 };
        this.sum.A = { gain: 0, rate: 0 };
        this.accept = 'N'; // F - only F, P - only P, A - All, N - none
    }
 
    getTags(order, flags, orders) // return if order should pass
    {
        const btcTrend = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        const curBFP = this.getBFP(order.type,btcTrend);

        order.fp = curBFP;
        let accept = this.calcAccept(order.time);
        let bfpass = 'N';

        if (accept === 'A') { bfpass='Y'; }
        else
        if (accept === 'N') { bfpass='N'; }
        else
            { bfpass = ( curBFP === accept ? 'Y' : 'N' ); }

        const tags = {
            fp: { value: '_'+curBFP },
            BFP: { value: bfpass, comment: 'A='+accept },
        };

        this.history.push(order);

        return tags;

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
   

    calcAccept(currentTime)
    {
        const forgetTime = currentTime - BFP.ANALYZE_TIME;
        this.history = this.history.filter( (p) => p.time > forgetTime );

        let closedOrders = this.history.filter( (o) => ! o.active );

        this.sum.F = this.sumHistory( closedOrders.filter( (o) => o.fp === 'F' ) );
        this.sum.P = this.sumHistory( closedOrders.filter( (o) => o.fp === 'P' ) );
        this.sum.A = this.sumHistory( closedOrders );

        let accept = 'N';

        if ( (this.sum.F > this.sum.P.gain) && (this.sum.F.gain > this.sum.A.gain) ) 
            { accept = 'F'; }

        if ( (this.sum.P.gain > this.sum.F.gain) && (this.sum.P.gain > this.sum.A.gain) ) 
            { accept = 'P'; }

        if ( (this.sum.A.gain > this.sum.F.gain) && (this.sum.A.gain > this.sum.P.gain) )
            { accept = 'A';}

        if ( (this.accept !== 'N') && (this.sum[this.accept].gain < 0)) {
            accept = 'N';
        }

        return accept;
    }

    ordersDump()
    {
        return this.history.map( (o) => {
            return {
                time: TF.timestampTime(o.time),
                fp: o.fp,
                clsd: ( o.active ? 'N' : 'Y' ),
                gain: o.gain
            }
        });
    }

    sumHistory(history) {
        let sum = history.reduce( (sum,order) => {
            if ( order.gain > 0 ) { sum.wins++; } else { sum.losts++;}
            sum.gain += order.gain;
            return sum;
        }, { gain: 0, wins: 0, losts: 0  } );

        sum.rate = calcWinLooseRatio(sum.wins, sum.losts);
        return sum;
    }
   

 
}


function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}

module.exports = BFP;

