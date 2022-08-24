/*
   Arbitrage is a special system tagger that puts RISKM:P flag onto orders

*/
const { winRatio } = require('../../../reports/helper.js');

class ArbitrageTagger {

    static getRISKMTagDescription() { return [{
        name: 'RISKM',
        vals: ['F','P'],
        desc: 'Pass (P) if total STAKE amount in active orders below specified risk.'
    }]}

    sumStakesInOrders(orders,epParams) {
        return orders.reduce( (sum, order) => {
            return sum + order.getRealMaxLoss(
                epParams.LEVERAGE,
                epParams.COST_BUY_PERCENT,
                epParams.COST_SELL_PERCENT
            );    
        },0);
    }

    getRiskPassOrders(newOrders, activeOrders, entries, deposit, epParams)
    {
        const sumNewOrders = this.sumStakesInOrders(newOrders,epParams);
        const sum = sumNewOrders + this.sumStakesInOrders(activeOrders,epParams)
        const riskSum = deposit * epParams.SIMULT_RISK_PERCENT;
        let avail = riskSum - sum;

        if ( avail <= 0) {
            return [];
        }

        if (avail >= sumNewOrders) {
            return newOrders;
        }

        let sortedOrders = [];

        for (var order of newOrders) {
            let ratio = this.calcRatio(entries,
                order.entry.symbol,
                order.entry.timeframe,
                order.entry.strategy
            );
            sortedOrders.push({ ratio, order });
        }

        sortedOrders.sort((a, b) => a.ratio - b.ratio );
        let passed = [];

        // todo: optimize: (avail > CURRENT STAKE)
        while ( (avail > 0) && (sortedOrders.length > 0) ) {
            let so = sortedOrders.pop();
            let maxLoss = so.order.getRealMaxLoss(
                epParams.LEVERAGE,
                epParams.COST_BUY_PERCENT,
                epParams.COST_SELL_PERCENT
            );
            if (avail >= maxLoss) {
                avail -= maxLoss;
                passed.push(so.order);
            }
        }

        return passed;

    }


    calcRatio(entries,symbol,timeframe,strategy) {
        let foundEntries = entries.filter( e => 
            (e.symbol===symbol)&&(e.timeframe===timeframe)&&(e.strategy===strategy)        
        );

        let wins = 0;
        let losts = 0;

        foundEntries.forEach( e => {
            if (e.isWin()) { wins++ } else { losts++ };
        });   

        let ratio = winRatio(wins,losts);
        return ratio;
    }

}

module.exports = ArbitrageTagger;

