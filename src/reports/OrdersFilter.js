

class OrdersFilter {

    filter(orders,filters)
    {
        const f = filters;
        let jsf = [];

        if (f.dateFrom)     { jsf.push(`(o.time >= ${f.dateFrom})`); }
        if (f.dateTo)       { jsf.push(`(o.time <= ${f.dateTo})`); }
        if (f.symbol)       { jsf.push(`(o.symbol=='${f.symbol}')`); }
        if (f.timeframe)    { jsf.push(`(o.timeframe=='${f.timeframe}')`); }
        if (f.strategy)     { jsf.push(`(o.strategy=='${f.strategy}')`); }
        if (f.tags)         {
            for (var t in f.tags) {
                jsf.push(`(o.getTagValue('${t}')=='${f.tags[t]}')`);
            }
        }
        if (f.js)           { jsf.push(f.js); }        

        return this.js(orders,jsf.join('&&'));
    }

    js(orders,jsCode) {
        let func = new Function('o', 'return '+jsCode+';');
        return orders.filter( o => func(o) );
    }  

}

const OF = new OrdersFilter();

module.exports = OF;