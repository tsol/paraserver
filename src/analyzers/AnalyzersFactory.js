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

            ['mac9',        'ma',            {source:'c', period: 9}, null],
            ['mac20',       'ma',           {source:'c', period: 20}, null],
            ['mac50',       'ma',           {source:'c', period: 50}, null],
            ['mac100',      'ma',           {source:'c', period: 100}, null],
            ['mac200',      'ma',           {source:'c', period: 200}, null],

            
            ['emac9',       'ema',           {source:'c', period: 9}, null],
            ['emac20',      'ema',           {source:'c', period: 20}, null],
            ['emac50',      'ema',           {source:'c', period: 50}, null],
            ['emac100',     'ema',           {source:'c', period: 100}, null],
            ['emac200',     'ema',           {source:'c', period: 200}, null],

            ['rmac9',      'rma',          {source:'c', period:  9}, null],
            ['rmac30',     'rma',          {source:'c', period: 30}, null],
            ['rmac75',     'rma',          {source:'c', period: 75}, null],
 
            ['rmac21',     'rma',          {source:'c', period: 21}, null],

            ['mat1',       'matrend',      {ma1:'emac20',ma2:'emac50',ma3:'emac200',name:'1'}, null],
            ['macd',        'macd',         {}, null],
            
            ['btctrend',   'btctrend',    null,   null],

            ['wfractals',   'wfractals',    null,   null],
            ['extremum',    'extremum',     null,   null],
            ['hl_trend',    'hl_trend',     null,   null],
            ['hills',       'hills',        null,   null],
            ['vlevels',     'vlevels',      null,   null],
            ['cdlpatts',    'cdlpatts',     null,   null],
            ['helper',      'helper',       orderManager, null ],
         
/*          ['dblbottom',   'st_dblbottom',    true,    null],
            ['macwfma',     'st_mac_wfma',     null,    null],
            ['tpcwfma',     'st_tpc_wfma',     null,    null],
            ['cma3buy',     'st_cma3',         true,    null],
            ['cma3sell',    'st_cma3',         false,   null],
            ['dbltop',      'st_dblbottom',    false,   null],

*/
            ['ttcwoff',     'st_ttc_woff',     null,    null],

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