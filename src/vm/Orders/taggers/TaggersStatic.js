/*
    TAGS are properties of either an Entry or Order object by which user
    can filter entries or orders building his perfect strategy.

    Static tags - are put to Entries they solely based on technical analyse
    and market history. They won't change depending on users choices.

    Dynamic tags - are out to Orders and are calculated each time
    user filters array of Entries using his parameters.

*/

const PeriodDetector = require('./helpers/PeriodDetector.js')

/* Static Tags applied to calculated entries and dont depend on user's filter */
const MACDF = require('./list_static/macdf.js');
const SESSIONS = require('./list_static/sessions.js');
const BTC = require('./list_static/btc.js');
const RSI = require('./list_static/rsi.js');
const HOS = require('./list_static/hos.js');
const GD100 = require('./list_static/gd100.js');
const MAXPRF = require('./list_static/maxprf.js');


class TaggersStatic {

    constructor() {

        this.staticPeriodDetector = new PeriodDetector();

        this.staticTaggers = [
            new MACDF(),
            new SESSIONS(),
            new RSI(),
            new GD100(),
            new MAXPRF(),
            new HOS(),
            new BTC()
        ];

    }

    getTagDescriptions() {
        let res = [];
        this.staticTaggers.forEach( t => res = [... res,  ... t.getTagsDescription()] );
        return res;
    }

    reset() {
        this.staticPeriodDetector.reset();
        this.staticTaggers.forEach( f => f.reset() );
    }
 
    getStaticTags(entry, flags, entries)
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
        
        let tags = {};

        this.staticTaggers.forEach( f => {
            tags = { ... tags, ... f.getStaticTags(entry,flags,entries,tags) };
        });

        return tags;
    }

}

module.exports = TaggersStatic;

