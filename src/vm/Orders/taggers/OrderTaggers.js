const { weekNum } = require('../../../reports/helper.js');

const MACDF = require('./list/macdf.js');
const SESSIONS = require('./list/sessions.js');
const BTC = require('./list/btc.js');
const MAXPRF = require('./list/maxprf.js');
const MCORRECT = require('./list/mcorrect.js');
const RSI = require('./list/rsi.js');
const HOS = require('./list/hos.js');
const GD100 = require('./list/gd100.js');

class OrderTaggers {

    constructor(params) {
        this.previousHour = null;
        this.previousDay = null;
        this.previousMonth = null;
        this.previousWeek = null;
        this.params = params;

        this.filters = [
            new MAXPRF(params),
            new MCORRECT(params),
            new MACDF(params),
            new SESSIONS(params),
            new BTC(params),
            new RSI(params),
            new HOS(params),
            new GD100(params)
        ];

    }

    reset() {
        this.filters.forEach( f => f.reset() );
    }
 
    getTags(order, flags, orders, tags)
    {

        const now = new Date(order.time);
        const hour = now.getHours();
        const day = now.getDate();
        const month = now.getMonth();
        const week = weekNum(now);

        if (this.previousHour !== hour) {
            this.previousHour = hour;
            this.filters.forEach( f => {
                f.hourlyTick(order,flags,orders,hour);
            });
        }

        if (this.previousDay !== day) {
            this.previousDay = day;
            this.filters.forEach( f => {
                f.dailyTick(order,flags,orders,day);
            });
        }

        if (this.previousMonth !== month) {
            this.previousMonth = month;
            console.log('OSF: new month '+month+' at '+now.toLocaleDateString('ru-RU'));

            this.filters.forEach( f => {
                f.monthlyTick(order,flags,orders,month);
            });
        }

        if (this.previousWeek !== week) {
            this.previousWeek = week;
            
            console.log('OSF: new week '+week+' at '+now.toLocaleDateString('ru-RU'));

            this.filters.forEach( f => {
                f.weeklyTick(order,flags,orders,week);
            });
        }

        this.filters.forEach( f => {
            tags = { ... tags, ... f.getTags(order,flags,orders,tags) };
        });

        return tags;
    }


}

module.exports = OrderTaggers;

