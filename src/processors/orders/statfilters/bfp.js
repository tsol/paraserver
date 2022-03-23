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
 
    passTrade(order, flags) // return if order should pass
    {
        const curBFP = this.getBFP(order,flags);
        order.fp = curBFP;

        this.calculate(order.time);

        if (this.accept === 'A') { return true; } // it is determined that all orders should pass
        if (this.accept === 'N') { return false; }

        return ( curBFP === this.accept );
    }

    addTrade(order) // add to statistics closed trade
    {
        this.history.push(order)
    }

    calculate(currentTime)
    {
        const forgetTime = currentTime - BFP.ANALYZE_TIME;
        this.history = this.history.filter( (p) => p.time > forgetTime );

        let closedOrders = this.history.filter( (o) => ! o.active );

        this.sum.F = this.sumHistory( closedOrders.filter( (o) => o.fp === 'F' ) );
        this.sum.P = this.sumHistory( closedOrders.filter( (o) => o.fp === 'P' ) );
        this.sum.A = this.sumHistory( closedOrders );

        if ( (this.sum.F > this.sum.P.gain) && (this.sum.F.gain > this.sum.A.gain) ) 
            { this.accept = 'F'; }

        if ( (this.sum.P.gain > this.sum.F.gain) && (this.sum.P.gain > this.sum.A.gain) ) 
            { this.accept = 'P'; }

        if ( (this.sum.A.gain > this.sum.F.gain) && (this.sum.A.gain > this.sum.P.gain) )
            { this.accept = 'A';}

        if ( (this.accept !== 'N') && (this.sum[this.accept].gain < 0)) {
            this.accept = 'N';
        }

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
   
    getBFP(order, flags)
    {
        const btcTrendValue = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        if (!btcTrendValue) {
            return 'N';
        }
        const orderType = order.type;

        const doFilter = (
             ( (btcTrendValue > 0) && (orderType == 'sell') ) ||
             ( (btcTrendValue < 0) && (orderType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }

    getComment(order, flags)
    {
        const btcTrendValue = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        const bfp = this.getBFP(order,flags);

        let res = {
            acpt: this.accept,
            fp: bfp,
            p_gain: this.sum.P.gain,
            f_gain: this.sum.F.gain,
            a_gain: this.sum.A.gain,
            orders: this.ordersDump()
        }

//        return JSON.stringify(res);

        return ' BTC_' + bfp + ' ['+btcTrendValue+'] ACPT:'+this.accept/*+' '+JSON.stringify(res)*/;
    }


}


function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}

module.exports = BFP;

