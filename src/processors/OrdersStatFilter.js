
const { TF } = require('../types/Timeframes.js');

class OrdersStatFilter {

    constructor() {
        this.sts = [];
    }

    reset() {
        this.sts = [];
    }
 
    passTrade(order, flags)
    {
        return  this.passStats(order.symbol, order.timeframe, order.strategy)
            &&  this.passBtcTrend(order.type, order.timeframe, order.strategyObject, flags);
    }

    passStats(symbol, timeframe, strategyName) // is ok to pass trade to real broker
    {
        const id = symbol+'-'+timeframe+'-'+strategyName;
        if (! this.sts[id] ) {
            return false;
        }
        
        const sts = this.sts[id];
        const len = sts.winsHistory.length;
        if (len < sts.maxOrders) { return null; };

        const wins = sts.winsHistory.reduce( (p,v) => p + (v ? 1 : 0), 0);
        const lost = len - wins;
        const ratio = calcWinLooseRatio(wins, lost);

        if (ratio >= sts.okRatio) {
            return true;
        }

        return false;
    }

    passBtcTrend(orderType, timeframe, strategy, flags)
    {
        const useBtc = strategy.getParams(timeframe).useBtc;
        if (! useBtc ) { return true; }
        const currentBtcFP = this.getBtcFP(orderType, flags);
        return (useBtc == currentBtcFP);
    }

    getBtcFP(orderType, flags)
    {
        const btcflag = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        if (!btcflag) {
            return '';
        } 
        const doFilter = (
             ( (btcflag > 0) && (orderType == 'sell') ) ||
             ( (btcflag < 0) && (orderType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P');
    }

    getBtcTrendString(orderType, flags)
    {
        const btcflag = flags.getTickerFlag('BTCUSDT-1h','btctrend');
        if (!btcflag) {
            return 'N';
        } 
        const doFilter = (
             ( (btcflag > 0) && (orderType == 'sell') ) ||
             ( (btcflag < 0) && (orderType == 'buy' ) )
        );
        return ( doFilter ? 'F' : 'P') + ' ['+btcflag+']';
    }

    addTrade(symbol, timeframe, strategyName, wasWin, strategyObject) // add to statistics
    {
        const id = symbol+'-'+timeframe+'-'+strategyName;

        if (! this.sts[id] ) {
            const params = strategyObject.getParams(timeframe);
            this.sts[id] = {
                maxOrders: params.statsMaxOrders,
                okRatio: params.statsOkRatio,
                winsHistory: []
            }
        }
        
        const sts = this.sts[id];

        sts.winsHistory.push(wasWin);

        if (sts.winsHistory.length > sts.maxOrders) { 
            sts.winsHistory.shift();
        }

    }


}


function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}


module.exports = OrdersStatFilter;

