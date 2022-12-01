/*
 ** Magnet levels
 **
 */

const Analyzer = require('../types/Analyzer');
const Magnets = require('./magnets/magnets');

const L = require('../helpers/levels.js');
const levels = require('../helpers/levels.js');

class MAGNETS extends Analyzer {
  constructor() {
    super();
  }

  init(io) {
    io.require('impulse');
    io.require('vlevels');
    this.magnets = new Magnets(io.cdb());
  }

  getId() {
    return 'magnets';
  }

  addCandle(candle, io) {
    super.addCandle(candle, io);
    io.cdb().setSource(this.getId());

    this.magnets.removeTouched(candle);

    const impulseGap = io.get('impulse.gap');

    if (impulseGap) {
      const gapCenterPrice =
        impulseGap.y0 + (impulseGap.y1 - impulseGap.y0) / 2;
      this.magnets.add(gapCenterPrice, 1, impulseGap.candle);
    }

    const impulseTallCandle = io.get('impulse.tall');
    if (impulseTallCandle) {
      const levelsArray = L.getLevelsArrayFromFlags(io.getFlags());
      const levelsInfo = L.getLevelsInfoAtRange(levelsArray, {
        y0: impulseTallCandle.bodyLow(),
        y1: impulseTallCandle.bodyHigh(),
      });

      if (levelsInfo && levelsInfo.levels) {
        levelsInfo.levels.forEach((level) => {
          this.magnets.add(level.getMiddleY(), 3, impulseTallCandle);
        });
      }
    }

    return null;
  }
}

module.exports = MAGNETS;
