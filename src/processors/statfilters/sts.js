const { TF } = require('../../types/Timeframes.js');

class STS {

   
    constructor() {
        this.reset();
    }

    reset() {
        this.sts = [];
    }


    passTrade(order, flags) // return if order should pass
    {
            const id = this.statId(order);
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

    addTrade(order) // add to statistics closed trade
    {
     
        const id = this.statId(order);

        if (! this.sts[id] ) {
            const params = order.strategyObject.getParams(order.timeframe);
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
 
    statId(order) {
        return order.symbol+'-'+order.timeframe+'-'+order.strategy
    }

}


function calcWinLooseRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}


module.exports = STS;

