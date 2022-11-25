/*
ТЭГ СОПРОТИВЛЕНИЕ УРОВНЕЙ (LR - LEVEL RESIST)

0 - нет уровней в зоне тейк и зоне стоп

1 - в зоне тейк есть уровни, но их сила меньше уровней стоп.
 
3 - есть уровни в обоих зонах, но в стопах уровнее сильнее на 30 
4 - есть уровни в обоих зонах, но в стопах уровнее сильнее на 40 
5 - есть уровни в обоих зонах, но в стопах уровнее сильнее на 50 

13 - в зоне тейк нет уровней, в зоне стоп есть уровни силнее 30
14 - в зоне тейк нет уровней, в зоне стоп есть уровни сильнее 40
15 - в зоне тейк нет уровней, в зоне стоп есть уровни сильнее 50

И обратно с минусом.

*/

const Tagger = require('../types/Tagger');

class LR extends Tagger {
  getTagsDescription() {
    let tags = [];

    tags.push({
      name: 'LR',
      vals: ['F', 'P'],
      desc:
        'Positive numbers mean more support from levels lower than entry price, ' +
        'negative show resistance from levels above entry.',
    });

    tags.push({
      name: 'LR.TP',
      vals: ['P', 'F', 'FF', 'FFF'],
      desc: '(P) pass if entryPrice zone is clear of levels.',
    });

    return tags;
  }

  getStaticTags(entry, flags, entries) {
    const { symbol, timeframe, entryPrice, takeProfit, stopLoss } = entry;

    const vlevels = flags.getFlagValueByST(symbol, timeframe, 'vlevels'); // levels of current timeframe
    if (!vlevels) return null;

    const vlevels_high = flags.getFlagValueByST(
      symbol,
      timeframe,
      'vlevels_high'
    ); // higher timeframe as specified by Timeframes.js

    let levelsArray = vlevels.getLevels();
    if (vlevels_high)
      levelsArray = [...levelsArray, ...vlevels_high.getLevels()];

    let tpY0, tpY1, slY0, slY1, spY0, spY1;

    if (entry.isLong) {
      tpY1 = takeProfit;

      spY1 = entryPrice + (entryPrice - stopLoss) / 4;

      tpY0 = entryPrice;
      slY1 = entryPrice;

      spY0 = entryPrice - (entryPrice - stopLoss) / 4;

      slY0 = stopLoss;
    } else {
      slY1 = stopLoss;

      spY1 = entryPrice + (stopLoss - entryPrice) / 4;
      slY0 = entryPrice;
      tpY1 = entryPrice;
      spY0 = entryPrice - (stopLoss - entryPrice) / 4;

      tpY0 = takeProfit;
    }

    const takeInfo = vlevels.getInfoAtRange(levelsArray, tpY0, tpY1);
    const stopInfo = vlevels.getInfoAtRange(levelsArray, slY0, slY1);
    const midzoneInfo = vlevels.getInfoAtRange(levelsArray, spY0, spY1);

    const takeTotal = takeInfo.supportWeight + takeInfo.resistWeight;
    const stopTotal = stopInfo.supportWeight + stopInfo.resistWeight;
    const midzoneTotal = midzoneInfo.supportWeight + midzoneInfo.resistWeight;

    let cmt = `${takeTotal} / ${midzoneTotal} / ${stopTotal}`;
    let res = stopTotal - takeTotal;

    return {
      LR: { value: res, comment: cmt },
      'LR.T': { value: takeTotal },
      'LR.S': { value: stopTotal },
      'LR.M': { value: midzoneTotal },
    };
  }
}

module.exports = LR;
