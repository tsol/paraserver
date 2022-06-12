/*
** SESSION TIME FLAG
*/

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger'); 

class SESSIONS extends Tagger {
    
    static UTC_HRS = {
        SYD: [ 0,1,2,3,4,5,6,21,22,23 ],
        TOK: [ 0,1,2,3,4,5,6,7,8,9 ],
        LON: [ 7,8,9,10,11,12,13,14,15,16 ],
        NYC: [ 12,13,14,15,16,17,18,19,20 ]
    };

    getTags(order, flags, orders, tags) // return if order should pass
    {
        const d = new Date(order.time);
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

