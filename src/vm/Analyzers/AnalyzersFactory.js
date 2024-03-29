/*
 ** This factory generates analyzator collections for TickerProcessors to run against.
 **
 */

const AnalyzersBox = require('./AnalyzersBox.js');

class AnalyzersFactory {
  constructor() {
    this.items = [
      ['atr14', 'atr', 14, null],
      ['rsi14', 'rsi', 14, null],
      ['impulse', 'impulse', null],

      ['mac9', 'ma', { source: 'c', period: 9 }, null],
      ['mac18', 'ma', { source: 'c', period: 18 }, null],

      ['mac20', 'ma', { source: 'c', period: 20 }, null],
      ['mac50', 'ma', { source: 'c', period: 50 }, null],
      ['mac100', 'ma', { source: 'c', period: 100 }, null],
      ['mac200', 'ma', { source: 'c', period: 200 }, null],

      ['emac9', 'ema', { source: 'c', period: 9 }, null],
      ['emac20', 'ema', { source: 'c', period: 20 }, null],
      ['emac21', 'ema', { source: 'c', period: 21 }, null],
      ['emac50', 'ema', { source: 'c', period: 50 }, null],
      ['emac100', 'ema', { source: 'c', period: 100 }, null],
      ['emac200', 'ema', { source: 'c', period: 200 }, null],

      ['rmac9', 'rma', { source: 'c', period: 9 }, null],
      ['rmac30', 'rma', { source: 'c', period: 30 }, null],
      ['rmac75', 'rma', { source: 'c', period: 75 }, null],

      ['rmac21', 'rma', { source: 'c', period: 21 }, null],
      ['rmac50', 'rma', { source: 'c', period: 50 }, null],
      ['rmac200', 'rma', { source: 'c', period: 200 }, null],

      ['mac5', 'ma', { source: 'c', period: 5 }, null],
      ['emac18', 'ema', { source: 'c', period: 18 }, null],
      ['mac89', 'ma', { source: 'c', period: 89 }, null],
      ['emac35', 'ema', { source: 'c', period: 35 }, null],
      ['emac144', 'ema', { source: 'c', period: 144 }, null],

      [
        'mat1',
        'matrend',
        { ma1: 'emac20', ma2: 'emac50', ma3: 'emac100', name: '1' },
        null,
      ],

      ['hos', 'hos', {}, null],

      ['macd', 'macd', {}, null],
      ['bbands', 'bbands', {}, null],

      ['btctrend', 'btctrend', '4h', null],
      ['macdf', 'macdf', {}, null],

      ['wfractals', 'wfractals', null, null],
      ['extremum', 'extremum', null, null],
      ['hl_trend', 'hl_trend', null, null],
      ['hills', 'hills', null, null],
      ['vlevels', 'vlevels', null, null],
      ['cdlpatts', 'cdlpatts', null, null],

      ['magnets', 'magnets', null],

      ['prices', 'prices', { maxCandles: 100 }, null],
      ['prev_swing', 'prev_swing', null, null],

      ['dblbottom', 'st_dblbottom', true, null],
      ['macwfma', 'st_mac_wfma', null, null],

      ['tpcwfma', 'st_tpc_wfma', null, null],

      ['cma3buy', 'st_tpc_cma3', true, null],
      ['cma3sell', 'st_tpc_cma3', false, null],

      ['ttcwoff', 'st_ttc_woff', null, null],
      ['geroflvl', 'st_ger_oflvl', null, null],
      ['hoffman1', 'st_hoffman1', null, null],
      ['bounce', 'st_bounce', null, null],
      ['volrev', 'st_volrev', null, null],
    ];

    this.reloadAll();
  }

  reloadAll() {
    let fileNames = {};

    this.items.forEach((p) => {
      fileNames[p[1]] = 1;
    });

    for (var fileName of Object.keys(fileNames)) {
      this.reloadFile(fileName);
    }
  }

  reloadFile(fileName) {
    const fullName = './list/' + fileName + '.js';
    delete require.cache[require.resolve(fullName)];

    this.items.forEach((p) => {
      if (p[1] === fileName) {
        p[3] = require(fullName);
      }
    });
  }

  getInstance(analyzerName) {
    const p = this.items.find((p) => p[0] === analyzerName);
    if (!p) {
      throw new Error('ANF: could not get instance of ' + analyzerName);
    }
    const AnalyzerClass = p[3];
    const constructorParams = p[2];
    return new AnalyzerClass(constructorParams);
  }

  createBox(strategiesToInit, ordersManager, candleProcessor, candleDebug) {
    const box = new AnalyzersBox(
      this,
      ordersManager,
      candleProcessor,
      candleDebug
    );

    strategiesToInit.forEach((s) => {
      box.addAnalyzer(s);
    });

    return box;
  }
}

module.exports = AnalyzersFactory;
