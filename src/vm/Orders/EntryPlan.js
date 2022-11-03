const SETTINGS = require('../../../private/private.js');
const TH = require('../../helpers/time.js');
const Order = require('../../types/Order.js');
const SettingsManager = require('../../helpers/SettingsManager');
const TaggersDynamic = require('./taggers/TaggersDynamic.js');
const ArbitrageTagger = require('./taggers/ArbitrageTagger.js');

class EntryPlan {

    static PARAMS_SCHEMA = {
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
        this.taggers = new TaggersDynamic();
        this.settings = new SettingsManager(EntryPlan.PARAMS_SCHEMA);
        this.arbitrageTagger = new ArbitrageTagger();
        this.updateParamsAndReset(SETTINGS.entryParams);
    }

    getDynamicTaggers() {
        return this.taggers;
    }

    updateParamsAndReset(params) {
        this.settings.reset(params);
        this.params = this.settings.getParams();
        
        this.filterFunction = this.genFilterFunction(this.params);

        this.entries = [];
        this.activeEntries = [];
        
        this.orders = [];
        this.activeOrders = [];

        this.deposit = this.params.START_SUM;
        this.taggers.reset();

    }

    genFilterFunction(params)
    {
        const p = params;
        let jsf = [];

        if (p.SYMBOLS)       { jsf.push('([\''+p.SYMBOLS.join('\',\'')+'\'].includes(o.entry.symbol))'); }
        if (p.TIMEFRAMES)    { jsf.push('([\''+p.TIMEFRAMES.join('\',\'')+'\'].includes(o.entry.timeframe))'); }
        if (p.STRATEGIES)    { jsf.push('([\''+p.STRATEGIES.join('\',\'')+'\'].includes(o.entry.strategy))'); }
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

    closeEntry(entry) {

        this.activeOrders.forEach( o => {
            if (o.entry == entry) {
                const gain = this.calcGain(o);
                this.deposit += gain;
                o.setGain(gain);
            }
        })

        this.activeOrders = this.activeOrders.filter( o => o.entry !== entry );
        this.activeEntries = this.activeEntries.filter( e => e !== entry );
    }


    // *** Getters

    getOrders() { return this.orders; }



    // *** OrdersManager interface

    // this is called upon candle processor phase end - param array contains
    // all entries being added at this iteration
    //

    addEntries(addedEntries) {

        addedEntries.forEach( e => {
            this.entries.push(e);
            this.activeEntries.push(e);
        });

        let newOrders = [];

        addedEntries.forEach( e => {
            var order = this.createOrder(e);
            
            if (order) {
                order.setTags( 
                    this.taggers.getDynamicTags(
                        order, 
                        this.orders,
                        this.activeOrders,
                        this.entries,
                        this.activeEntries,
                        addedEntries,
                        this.params  
                    )
                );

                newOrders.push(order);

            }

        });


        // todo: fix, firstly filter, than arbitrageTag and filter again.
        // In fact: remove RISKM tag - just enable if params.SIMULT_RISK_PERCENT > 0

        //let passedOrders = this.arbitrageTagger.getRiskPassOrders(
        //    newOrders, this.activeOrders, this.entries, this.deposit, this.params);

        // passedOrders.forEach(o => o.setTag('RISKM','P'));

        newOrders = newOrders.filter( o => this.filterFunction(o) );

        newOrders.forEach( order => {
            order.setWallet(this.deposit);
            this.orders.push(order);
            this.activeOrders.push(order);
        });

        return newOrders;

    }




    // GUI interface:

    getParams() {
        return this.params;
    }

    getOrdersGUI(args) {
        return this.orders.map( o => o.toGUI() );
    }

    // this is called by GUI
    processEntriesHistory(params,entries) {

        console.log('EP: recalc: processing history entries -> orders '+TH.ls(TH.now()))
        this.updateParamsAndReset(params);

        // process in historical manner all opens and closes

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
            lastCloseEntry.c.push(e);
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


        console.log('EP: recalc: done '+TH.ls(TH.now()))

        return this.params;

    }


}


module.exports = EntryPlan;