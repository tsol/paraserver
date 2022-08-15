/*
** SESSION TIME FLAG
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class SESSIONS extends Tagger {
    
    static UTC_HRS = {
        SYD: [ 0,1,2,3,4,5,6,                                      21,22,23 ],
        TOK: [ 0,1,2,3,4,5,6,7,8,9 ],
        LON: [               7,8,9,10,11,12,13,14,15,16 ],
        NYC: [                           12,13,14,15,16,17,18,19,20 ]
    };

    getTagsDescription() { return [
        {
            name: 'SYD',
            vals: ['P','F'],
            desc: 'Pass (P) if entry is open when Sydney market is active 0-6, 21-23 UTC'
        },
        {
            name: 'TOK',
            vals: ['P','F'],
            desc: 'Pass (P) if entry is open when Tokyo market is active 0-9 UTC'
        },
        {
            name: 'LON',
            vals: ['P','F'],
            desc: 'Pass (P) if entry is open when London market is active 7-16 UTC'
        },
        {
            name: 'NYC',
            vals: ['P','F'],
            desc: 'Pass (P) if entry is open when New York market is active 12-20 UTC'
        },
        {
            name: 'WRK',
            vals: ['P','F'],
            desc: 'Pass (P) if entry is open on a work day Mon-Fri, (F) on Sat, Sun'
        },       
    ]}

    getStaticTags(entry, flags, entries, tags) // return if entry should pass
    {
        const d = new Date(entry.time);
        let hour = d.getUTCHours();

        let res = {};

        Object.keys(SESSIONS.UTC_HRS).forEach( s => {
            res[s] = { value: (SESSIONS.UTC_HRS[s].includes(hour) ? 'P' : 'F') };
        });

        res['WRK'] = { value: ( [0,6].includes(d.getDay()) ? 'F' : 'P' ) };

        return res;
    }

}

module.exports = SESSIONS;

