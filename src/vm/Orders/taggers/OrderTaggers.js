const PeriodDetector = require('./helpers/PeriodDetector.js')

/* Static Tags applied to calculated entries and dont depend on user's filter */
const MACDF = require('./list_static/macdf.js');
const SESSIONS = require('./list_static/sessions.js');
const BTC = require('./list_static/btc.js');
const RSI = require('./list_static/rsi.js');
const HOS = require('./list_static/hos.js');
const GD100 = require('./list_static/gd100.js');
const MAXPRF = require('./list_static/maxprf.js');

/* Static Tags calculated and applied to orders and depend on user's filter */
const MCORRECT = require('./list_dynamic/mcorrect.js');

class OrderTaggers {

    constructor(params) {

        this.staticPeriodDetector = new PeriodDetector();
        this.dynamicPeriodDetector = new PeriodDetector();

        this.params = params;

        this.dyanamicTaggers = [
            new MCORRECT(params),
        ];

        this.staticTaggers = [
            new MACDF(params),
            new SESSIONS(params),
            new RSI(params),
            new GD100(params),
            new MAXPRF(params),
            new HOS(params),
            new BTC(params)
        ];

        this.allTaggers = [ ... this.dyanamicTaggers, ... this.staticTaggers];

    }

    getTagDescriptions() {
        let res = [];
        this.allTaggers.forEach( t => res = [... res,  ... t.getTagsDescription()] );
        return res;
    }

    resetStatic() {
        this.staticPeriodDetector.reset();
        this.staticTaggers.forEach( f => f.reset() );
    }
 
    resetDynamic() {
        this.dynamicPeriodDetector.reset();
        this.dynamicTaggers.forEach( f => f.reset() );
    }

    getStaticTags(entry, flags, entries, tags)
    {

        const pd = this.staticPeriodDetector.detect(entry.time);

        if (pd.hour) {
            this.staticTaggers.forEach( f => {
                f.staticHourly(entry,flags,entries,pd.hour);
            });
        }

        if (pd.day) {
            this.staticTaggers.forEach( f => {
                f.staticDaily(entry,flags,entries,pd.day);
            });
        }

        if (pd.month) {
            this.staticTaggers.forEach( f => {
                f.staticMonthly(entry,flags,entries,pd.month);
            });
        }

        if (pd.week) {
            this.staticTaggers.forEach( f => {
                f.staticWeekly(entry,flags,entries,pd.week);
            });
        }

        this.staticTaggers.forEach( f => {
            tags = { ... tags, ... f.getStaticTags(entry,flags,entries,tags) };
        });

        return tags;
    }


    getDynamicTags(order, orders, activeOrders, entries, activeEntries, tags)
    {
        const pd = this.dynamicPeriodDetector.detect(order.entry.time);

        if (pd.hour) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicHourly(order, orders, activeOrders, entries, activeEntries,
                     this.params, pd.hour);
            });
        }

        if (pd.day) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicDaily(order, orders, activeOrders, entries, activeEntries,
                     this.params, pd.day);
            });
        }

        if (pd.month) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicMonthly(order, orders, activeOrders, entries, activeEntries,
                     this.params, pd.month);
            });
        }

        if (pd.week) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicWeekly(order, orders, activeOrders, entries, activeEntries,
                     this.params, pd.week);
            });
        }

        this.dynamicTaggers.forEach( f => {
            tags = {
                ... tags, 
                ... f.getDynamicTags(order, orders, activeOrders, entries, activeEntries,
                     this.params, tags)
            };
        });

        return tags;
    }



}

module.exports = OrderTaggers;

