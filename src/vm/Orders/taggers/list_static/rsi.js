/*
 ** RSI FLAG (BUY OK IF rsi>50, SELL OK IF rsi<50)
 */

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger');

class RSI extends Tagger {
  getTagsDescription() {
    return [
      {
        name: 'RSI',
        vals: ['P', 'F'],
        desc: 'Pass (P) buy entries when RSI>50, pass sell when RSI<50. Otherwise filters (F).',
      },
    ];
  }

  getStaticTags(entry, flags, entries) {
    const { symbol, timeframe } = entry;
    const rsi = flags.getFlagValueByST(symbol, timeframe, 'rsi14');

    if (!rsi) {
      return;
    }

    let filterResult = 'P';

    if (rsi < 50) {
      if (entry.isLong) {
        filterResult = 'F';
      }
    } else if (rsi > 50) {
      if (!entry.isLong) {
        filterResult = 'F';
      }
    }

    return { RSI: { value: filterResult } };
  }
}

module.exports = RSI;
