const TH = require('../../../../helpers/time');
const { entryStats } = require('../../../../reports/helper');
const Tagger = require('../types/Tagger');

class GD100 extends Tagger {

    static NUM_ORDERS       = 150;
    static MIN_RATIO        = 40;

    constructor() {
        super();
        this.allow = [];
        this.disallow = [];
    }
    
    getTagsDescription() { return [
        {
            name: 'GD',
            vals: ['Y','N'],
            desc: 'Good (Y) if last '+GD100.NUM_ORDERS+' ordes with same symbol-timeframe-strategy '+
                'had above '+GD100.MIN_RATIO+'% win rate.'
        },
        {
            name: 'BD',
            vals: ['Y','N'],
            desc: 'Bad (Y) if last '+GD100.NUM_ORDERS+' ordes with same symbol-timeframe-strategy '+
            'had win rate below '+GD100.MIN_RATIO+' percent.'
        },      
    ]}

    staticWeekly(entry,flags,entries,month) {
 
        const spl = {};
        const bo = entries.sort( (a,b) => b.time > a.time );
   
        bo.forEach( (o) => {
            let key = this.key(o);
            if (! spl[ key ]) { spl[ key ] = []; }
            if (! o.active && (spl[key].length < GD100.NUM_ORDERS)) {
                spl[key].push(o);
            }
        });

        this.allow = [];
        this.disallow = [];

        Object.keys(spl).forEach( (k) => {
            if (spl[k].length >= GD100.NUM_ORDERS) {
                let res = entryStats(spl[k]);

                if (res.ratio >= GD100.MIN_RATIO )
                {
                    this.allow.push(k);
                }
                else {
                    this.disallow.push(k);
                }
            }
        });

        //console.log('GD100: TICK '+TH.ls(entry.time));
        //console.log(this.allow);
        //console.log(this.disallow);

    }
 
    getStaticTags(entry, flags, entries) 
    {
        return {
            GD: { value: ( this.isAllowed(entry) ? 'Y' : 'N') },
            BD: { value: ( this.isDisallowed(entry) ? 'Y' : 'N') }
        }
    }

    key(entry) {
        return entry.symbol+'-'+entry.timeframe+'-'+entry.strategy;
    }

    isAllowed(entry)
    {
        return this.allow.includes(this.key(entry));
    }
    
    isDisallowed(entry)
    {
        return this.disallow.includes(this.key(entry));
    }

}


module.exports = GD100;