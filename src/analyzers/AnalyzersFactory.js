/*
** This factory generates analyzator collections for TickerProcessors to run against.
**
*/

const AnalyzersBox = require('./AnalyzersBox.js');

class AnalyzersFactory {

    constructor(orderManager) {

        this.items = [
            ['atr14',       'atr',          14,     null],
            ['rsi14',       'rsi',          14,     null],
            ['mac20',       'ma',           {source:'c', period: 20}, null],
            ['mac50',       'ma',           {source:'c', period: 50}, null],
            ['mac100',      'ma',           {source:'c', period: 100}, null],
            ['mac200',      'ma',           {source:'c', period: 200}, null],
            
            ['rmac21',      'rma',          {source:'c', period: 21}, null],
            ['rmac50',      'rma',          {source:'c', period: 50}, null],
            ['rmac100',     'rma',          {source:'c', period: 100}, null],
            ['rmac200',     'rma',          {source:'c', period: 200}, null],

            ['rmac7',      'rma',          {source:'c', period:  7}, null],
            ['rmac9',      'rma',          {source:'c', period:  9}, null],
            ['rmac30',     'rma',          {source:'c', period: 30}, null],
            ['rmac75',     'rma',          {source:'c', period: 75}, null],
            ['rmac150',    'rma',          {source:'c', period: 150}, null],


            ['wfractals',   'wfractals',    null,   null],
            ['extremum',    'extremum',     null,   null],
            ['hl_trend',    'hl_trend',     null,   null],
            ['hills',       'hills',        null,   null],
            ['vlevels',     'vlevels',      null,   null],
            ['cdlpatts',    'cdlpatts',     null,   null],
            ['helper',      'helper',       orderManager, null ],

            ['crossma3',    'crossma3',      null,   null],
            ['crosswma',    'crosswma',      null,   null],
            ['cross2wma',    'cross2wma',      null,   null],
            ['touchma',     'touchma',      null,   null],
            ['dblbottom',   'dblbottom',    null,   null],
    
        ];
/*
        ['crossma3',    'crossma3',      null,   null],
        ['crosswma',    'crosswma',      null,   null],
        ['cross2wma',    'cross2wma',      null,   null],
        ['touchma',     'touchma',      null,   null],
        ['dblbottom',   'dblbottom',    null,   null],

*/


        this.reloadAll();

    }

    reloadAll() {
        let fileNames = {};

        this.items.forEach( (p) => { fileNames[ p[1] ] = 1 } );

        for (var fileName of Object.keys(fileNames)) {
            this.reloadFile(fileName);
        }

    }

    reloadFile(fileName) {
        const fullName = './list/'+fileName+'.js';
        delete require.cache[require.resolve(fullName)];

        this.items.forEach( (p) => {
            if (p[1] === fileName) {
                p[3] = require(fullName);
            }
        });

    }

    getInstance(analyzerName, params) {
        const p = this.items.find( p => p[0] === analyzerName );
        if (! p) { throw new Error('ANF: could not get instance of '+analyzerName); }
        const AnalyzerClass = p[3];
        const constructorParams = params || p[2];
        return new AnalyzerClass(constructorParams);
    }

    createBox() {

        let anArray = [];

        this.items.forEach( (p) => {
            anArray.push( this.getInstance(p[0],null) );
        })

        return new AnalyzersBox( anArray );
    }

}

module.exports = AnalyzersFactory;