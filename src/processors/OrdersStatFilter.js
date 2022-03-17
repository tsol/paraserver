
const { TF } = require('../types/Timeframes.js');

class OrdersStatFilter {

    constructor() {
        this.sts = [];
    }

    reset() {
        this.sts = [];
    }
 
    passTrade(symbol, timeframe, strategyName) // is ok to pass trade to real broker
    {
        const id = symbol+'-'+timeframe+'-'+strategyName;
        if (! this.sts[id] ) {
            return null;
        }
        const sts = this.sts[id];
        const len = sts.winsHistory.length;
        if (len < sts.maxOrders) { return null; };

        const wins = sts.winsHistory.reduce( (p,v) => p + (v ? 1 : 0), 0);
        const lost = len - wins;
        const ratio = calcWinLooseRatio(wins, lost);

        if (ratio >= sts.okRatio) {
            return ratio;
        }

        return null;
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

