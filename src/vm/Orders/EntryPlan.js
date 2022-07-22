const SETTINGS = require('../../../private/private.js');
const Order = require('../../types/Order.js');

class EntryPlan {

    static PARAMS = {
        START_SUM:              { def: 1000 },       // usd
        STAKE_MODE:             { def: 'fixed' },    // fixed, percent
        STAKE_PERCENT:          { def: 0.05 },       // stake = DEPOSIT * STAKE_PERCENT      
        SIMULT_RISK_PERCENT:    { def: 0.1 },        // DEPOSIT * SIMULT_RISK = how many USD in risk in a moment
        STAKE_FIXED:            { def: 5 },          // in USD
        LEVERAGE:               { def: 20 },         // x Leverage
        COST_BUY_PERCENT:       { def: 0.0004 },     // 4 cents from every 100 dollars
        COST_SELL_PERCENT:      { def: 0.0004 },      // 0.04 % taker comission

        TAGS:                   { def: null },
        SYMBOLS:                { def: null },
        STRATEGIES:             { def: null },
        TIMEFRAMES:             { def: null },
        JSCODE:                 { def: null }
    };

    constructor(brokerCandles) {
        this.brokerCandles = brokerCandles;        
        this.reset(SETTINGS.entryParams);
    }

    reset(params) {
        
        this.params = {};

        for (var p in EntryPlan.PARAMS) {
            this.params[p] = ( params.hasOwnProperty(p) ? params[p] : EntryPlan.PARAMS[p].def );
        }

        this.filterFunction = this.genFilterFunction(this.params);

        this.entries = [];
        this.activeEntries = [];
        
        this.orders = [];
        this.activeOrders = [];

        this.deposit = this.params.START_SUM;

        return this.params;

    }

    genFilterFunction(params)
    {
        const p = params;
        let jsf = [];

        if (p.SYMBOLS)       { jsf.push('([\''+p.SYMBOLS.join('\',\'')+'\'].includes(o.symbol))'); }
        if (p.TIMEFRAMES)    { jsf.push('([\''+p.TIMEFRAMES.join('\',\'')+'\'].includes(o.timeframe))'); }
        if (p.STRATEGIES)    { jsf.push('([\''+p.STRATEGIES.join('\',\'')+'\'].includes(o.strategy))'); }
        if (p.TAGS)         {
            for (var t in p.TAGS) {
                jsf.push(`(o.getTagValue('${t}')=='${p.TAGS[t]}')`);
            }
        }
        if (p.JSCODE)           { jsf.push('('+p.JSCODE+')'); }
        const code = 'return '+jsf.join('&&')+';';

        return new Function('o', code);   
    }

    createOrder(entry) {
        let q = this.calcQuantity(entry);
        if (q && (q.quantity > 0)) {
            const order = new Order(entry, q.quantity);
            order.setStake(q.usd);
            return order;
        }
        return null;
    }

    calcQuantity(entry) {
        let usdSum = 0;

        if (this.params.STAKE_MODE == 'fixed') {
            usdSum = this.params.STAKE_FIXED * this.params.LEVERAGE;
        }
        else if (this.params.STAKE_MODE == 'percent') {
            usdSum = this.deposit * this.params.STAKE_PERCENT;
            if (usdSum < 1) { return null; }
            usdSum = usdSum * this.params.LEVERAGE;
        }
        else {
            return null;
        }

        try {    

            const aligned = this.brokerCandles.getAlignedEntryDetails(
                entry.symbol,
                entry.entryPrice,
                usdSum,
                entry.stopLoss,
                entry.takeProfit
            );
    
            return { quantity: aligned.quantity, usd: usdSum }

        } catch (e) {
                console.log("BAD ORDER PARAMS: "+e.message);
                return null;
        }

    }

    calcGain(order)
    {
        const boughtInUSD = order.quantity * order.entry.entryPrice;
        const soldInUSD = order.quantity * order.entry.currentPrice;
        const commissionInUSD = soldInUSD * this.params.COST_SELL_PERCENT +
                                boughtInUSD * this.params.COST_BUY_PERCENT;

        if (order.entry.isLong()) {
            return soldInUSD - boughtInUSD - commissionInUSD;
        }
        
        return boughtInUSD - soldInUSD - commissionInUSD;
    }


    addEntries(entriesArray) {

        entriesArray.forEach( e => {
            this.entries.push(e);
            this.activeEntries.push(e);
        });

        let newOrders = [];

        entriesArray.forEach( e => {
            var order = this.createOrder(e);
            // todo: here dynamic tags added
            if (order && this.filterFunction(order.entry)) {
                newOrders.push(order);
            }
        });

        // todo: here simultaneous risk conditions with arbitrage
        // should be applied (if required) and newOrders reduced to winners

        newOrders.forEach( order => {
            order.setWallet(this.deposit);
            this.orders.push(order);
            this.activeOrders.push(order);
        });

        return newOrders;

    }


    closeEntry(entry) {

        this.activeOrders.forEach( o => {
            if (o.entry == entry) {
                // todo: modify deposit
                const gain = this.calcGain(o);
                this.deposit += gain;
                o.setGain(gain);
            }
        })

        this.activeOrders = this.activeOrders.filter( o => o.entry !== entry );
        this.activeEntries = this.activeEntries.filter( e => e !== entry );
    }

    // GUI interface:

    getParams() {
        // todo: return merged EntryPlan.PARAMS + this.params 
        return this.params;
    }

    getOrdersList(args) {
        return this.orders.map( o => o.toGUI() );
    }

    // this is called by GUI
    processEntriesHistory(params,entries) {

        this.reset(params);

        // todo: process in historycal manner all opens and closes

        let seqo = [];
        let lastOpenEntry = { t: null };

        entries.forEach( e => {
            if (lastOpenEntry.t != e.time) {
                lastOpenEntry = { t: e.time, o: [], c: [] };
                seqo.push(lastOpenEntry);
            }
            lastOpenEntry.o.push(e);
        });

        let cls = entries.filter( e => ! e.isActive() ).sort( (a,b) => a.closeTime - b.closeTime );

        let seqc = [];
        let lastCloseEntry = { t: null };
        cls.forEach( e => {
            if (lastCloseEntry.t != e.closeTime) {
                lastCloseEntry = { t: e.closeTime, c: [], o: [] };
                seqc.push(lastCloseEntry);
            }
            lastCloseEntry.o.push(e);
        });

        let seq = [ ... seqo, ... seqc ].sort( (a,b) => a.t - b.t );

        while (seq.length > 0)  {
        
            let s = seq.shift();
            let o = s.o;
            let c = s.c;

            if ((seq.length > 0)&&(seq[0].t == s.t)) {
                s = seq.shift();
                o = [ ... o, ... s.o ];
                c = [ ... c, ... s.c ];
            }

            c.forEach( e => this.closeEntry(e) );
            this.addEntries(o);

        }

        return this.params;

    }


}


module.exports = EntryPlan;