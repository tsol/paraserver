/*
MAGNET

*/

const Tagger = require('../types/Tagger');

class MAG extends Tagger {
  getTagsDescription() {
    let tags = [];

    tags.push({
      name: 'MAG',
      vals: ['F', 'P'],
      desc: 'If magnet pull is stronger in direction of a deal - then (P) passes.',
    });

    return tags;
  }

  getStaticTags(entry, flags, entries) {
    const { symbol, timeframe, entryPrice, takeProfit, stopLoss } = entry;

    const magnets = flags.getFlagValueByST(symbol, timeframe, 'magnets');
    if (!magnets) return null;

    const isLong = entry.isLong;

    const takeMagnets = isLong
      ? magnets.filterRange(entryPrice, takeProfit)
      : magnets.filterRange(takeProfit, entryPrice);

    const stopMagnets = isLong
      ? magnets.filterRange(stopLoss, entryPrice)
      : magnets.filterRange(entryPrice, stopLoss);

    const infoTake = magnets.getInfo(takeMagnets);
    const infoStop = magnets.getInfo(stopMagnets);

    const res = infoTake.weight > infoStop.weight ? 'P' : 'F';
    const cmt = infoTake.weight + ' / ' + infoStop.weight;

    return {
      MAG: { value: res, comment: cmt },
    };
  }
}

module.exports = MAG;
