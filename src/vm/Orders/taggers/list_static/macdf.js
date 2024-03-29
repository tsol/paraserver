/*
 ** MACD FLAG PREVENT BUY OR SELL
 */

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger');

class MACDF extends Tagger {
  getTagsDescription() {
    return [
      {
        name: 'MACDF',
        vals: ['P', 'F'],
        desc:
          'Filters (F) buy entries when MACD histogram line switched below ZERO, less ' +
          'than 3 candles ago. And vice-versa for sell entries.',
      },
    ];
  }

  getStaticTags(entry, flags, entries) {
    const { symbol, timeframe } = entry;

    const macdf = flags.getFlagValueByST(symbol, timeframe, 'macdf');
    if (!macdf) return;

    let filterResult = 'P';

    if (macdf.r == 'db') {
      if (entry.isLong) {
        filterResult = 'F';
      }
    } else if (macdf.r == 'ds') {
      if (!entry.isLong) {
        filterResult = 'F';
      }
    }

    return { MACDF: { value: filterResult } };
  }
}

module.exports = MACDF;
