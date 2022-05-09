/*
    CUSTOM strategies filter
*/
const Tagger = require('../types/Tagger'); 

const ALLOWED = [
    'AVAXUSDT-macwfma',
    'PEOPLEUSDT-macwfma',
    'RUNEUSDT-macwfma',
    'RENUSDT-macwfma',

    'IOTXUSDT-tpcwfma',
    'SRMUSDT-tpcwfma',
    'SANDUSDT-tpcwfma',
    'ALICEUSDT-tpcwfma',
];

class CUSTOM6 extends Tagger {

    getTags(order, flags, orders, tags) 
    {
        const key = order.symbol+'-'+order.strategy;
    
        return {
            CU6: { value:  ( ALLOWED.includes(key) ? 'Y' : 'N') },
        }

    }

}

module.exports = CUSTOM6;

