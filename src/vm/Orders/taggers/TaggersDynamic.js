/*
    TAGS are properties of either an Entry or Order object by which user
    can filter entries or orders building his perfect strategy.

    Static tags - are put to Entries they solely based on technical analyse
    and market history. They won't change depending on users choices.

    Dynamic tags - are out to Orders and are calculated each time
    user filters array of Entries using his parameters.

*/

const PeriodDetector = require('./helpers/PeriodDetector.js')

const MARGIN = require('./list_dynamic/margin.js');
const SAME = require('./list_dynamic/same.js');

class TaggersDynamic {

    constructor() {
        this.dynamicPeriodDetector = new PeriodDetector();
        this.dynamicTaggers = [
            new MARGIN(),
            new SAME(),
        ];
    }

    getTagDescriptions() {
        let res = [];
        this.dynamicTaggers.forEach( t => res = [... res,  ... t.getTagsDescription()] );
        return res;
    }

    reset() {
        this.dynamicPeriodDetector.reset();
        this.dynamicTaggers.forEach( f => f.reset() );
    }

    getDynamicTags(order, orders, activeOrders, 
        entries, activeEntries, addedEntries, params)
    {
        const pd = this.dynamicPeriodDetector.detect(order.entry.time);

        if (pd.hour) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicHourly(order, orders, activeOrders, entries, activeEntries,
                     params, pd.hour);
            });
        }

        if (pd.day) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicDaily(order, orders, activeOrders, entries, activeEntries,
                     params, pd.day);
            });
        }

        if (pd.month) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicMonthly(order, orders, activeOrders, entries, activeEntries,
                     params, pd.month);
            });
        }

        if (pd.week) {
            this.dynamicTaggers.forEach( f => {
                f.dynamicWeekly(order, orders, activeOrders, entries, activeEntries,
                     params, pd.week);
            });
        }
        
        let tags = {};

        this.dynamicTaggers.forEach( f => {
            tags = {
                ... tags, 
                ... f.getDynamicTags(order, orders, activeOrders, entries, activeEntries,
                     addedEntries, params)
            };
        });

        return tags;
    }



}

module.exports = TaggersDynamic;

