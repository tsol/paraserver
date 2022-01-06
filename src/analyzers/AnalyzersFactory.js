/*
** This factory generates analyzator collections for TickerProcessors to run against.
**
*/

const AnalyzersBox = require('./AnalyzersBox.js');

class AnalyzersFactory {

    constructor() {

        this.items = [
            ['atr14',       'atr',          14,     null],
            ['mac20',       'ma',           {source:'c', period: 20}, null],
            ['extremum',    'extremum',     null,   null],
            ['hl_trend',    'hl_trend',     null,   null],
            ['hills',       'hills',        null,   null],
            ['vlevels',     'vlevels',      null,   null],
            ['candlepatterns',     'candlepatterns',      null,   null],
            ['dblbottom',   'dblbottom',    null,   null],
            ['touchma',     'touchma',      null,   null]
        ];
        
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