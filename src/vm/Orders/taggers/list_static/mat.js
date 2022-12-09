/*
 ** Moving Avarage Trend Tag
 */

const { TF } = require('../../../../types/Timeframes.js');

const Tagger = require('../types/Tagger');

class MAT extends Tagger {
  static INDICATOR = 'mat1';
  static TIMEFRAMES = ['1h', '4h', '1d'];

  getTagsDescription() {
    let tags = [];
    MAT.TIMEFRAMES.forEach((tf) => {
      tags.push({
        name: 'MAT' + tf,
        vals: ['P', 'F'],
        desc: 'Pass (P) if MATREND is inline with order (F) otherwise.',
      });
    });
    return tags;
  }

  getStaticTags(entry, flags, entries) {
    let tags = {};

    MAT.TIMEFRAMES.forEach((tf) => {
      let tagValue = this.createTag(entry, flags, tf);
      if (tagValue) {
        tags['MAT' + tf] = { value: tagValue };
      }
    });

    return tags;
  }

  createTag(entry, flags, timeframe) {
    const { symbol, isLong } = entry;

    const matValue = flags.getTickerFlag(
      symbol + '-' + timeframe,
      MAT.INDICATOR
    );

    if (!matValue) return null;

    const doPass =
      (isLong && matValue === 'UP') || (!isLong && matValue === 'DN');

    return doPass ? 'P' : 'F';
  }
}

module.exports = MAT;
