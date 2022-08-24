/*
    Orders Tagger - sets tags on orders 
*/
// TODO: separate this also

class Tagger {

    constructor(params) {
        this.reset();
        this.params = params;

        this.name = 'TAG';
        this.vals = ['P','F'];
        this.desc = 'General tag';
    }

    getTagsDescription() { return [{
        name: this.name,
        vals: this.vals,
        desc: this.desc
    }]}

    reset() {}

    staticHourly(entry,flags,entries,hour) {}    
    staticDaily(entry,flags,entries,day) {}
    staticWeekly(entry,flags,entries,week) {}
    staticMonthly(entry,flags,entries,month) {} 

    getStaticTags(entry, flags, entries) 
    {
        return {
            TAGNAME: { value: 'TAGVALUE' },
        }
    }

    getDynamicTags(order, orders, activeOrders, entries, activeEntries, addedEntries, params) 
    {
        return {
            TAGNAME: { value: 'TAGVALUE' },
        }

    }

    dynamicHourly(order, orders, activeOrders, entries, activeEntries, params, hour) {}    
    dynamicDaily(order, orders, activeOrders, entries, activeEntries, params, day) {}
    dynamicWeekly(order, orders, activeOrders, entries, activeEntries, params, week) {}
    dynamicMonthly(order, orders, activeOrders, entries, activeEntries, params, month) {} 

}

module.exports = Tagger;

