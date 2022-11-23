/*
 ** HL_TREND analyzer tag
 */

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger');

class HLT extends Tagger {
  static MA_TIMEFRAMES = ['15m', '1h'];

  getTagsDescription() {
    let tags = [];
    HLT.MA_TIMEFRAMES.forEach((p) => {
      tags.push({
        name: 'HLT' + p,
        vals: ['-3', '-2', '-1', '0', '1', '2', '3'],
        desc:
          'Value 3 - strong trend in same direction. Value 2 - new trend in same direction ' +
          '1 - possible trend in same direction. 0 - no trend. Negative value - trend in oposite direction.',
      });
    });
    return tags;
  }

  getStaticTags(
    entry,
    flags,
    entries // return if entry should pass
  ) {
    let tags = {};

    HLT.MA_TIMEFRAMES.forEach((tf) => {
      let tagValue = this.createTag(entry, flags, tf);
      if (tagValue) {
        tags['HLT' + tf] = { value: tagValue };
      }
    });

    return tags;
  }

  createTag(entry, flags, timeframe) {
    const hlTrend = flags.getTickerFlag(
      entry.symbol + '-' + timeframe,
      'hl_trend'
    );

    /*
        ** hl_trend: {
            **     trend: false,
            **     direction: 0,
            **     swings: 1,
            **     bias: -1
            ** }

*/

    let module = 0;
    if (hlTrend.trend) {
      module = 2;
      if (hlTrend.swings > 3) {
        module = 3;
      }
    } else if (hlTrend.bias !== 0) {
      module = 1;
    }

    if (entry.isLong && hlTrend.bias > 0) return module;

    if (!entry.isLong && hlTrend.bias < 0) return module;

    return -1 * module;
  }
}

module.exports = HLT;
