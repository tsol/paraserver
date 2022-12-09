/*
 ** Magnet levels
 **
 */

const Analyzer = require('../types/Analyzer');
const Magnets = require('./magnets/magnets');
const Magnet = require('./magnets/magnet');

const L = require('../helpers/levels.js');
const levels = require('../helpers/levels.js');

class PARAMS {
  static MAX_CANDLES_BACK = 30;
}

class MAGNETS extends Analyzer {
  constructor() {
    super();
    this.trendStartCandle = null;
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

    const removedCount = this.magnets.removeTouched(candle);

    const impulseGap = io.get('impulse.gap');

    if (impulseGap) {
      const gapCenterPrice =
        impulseGap.y0 + (impulseGap.y1 - impulseGap.y0) / 2;
      this.magnets.add(
        gapCenterPrice,
        1,
        impulseGap.candle,
        Magnet.TYPES.IMBALANCE
      );
    }

    const impulseEndCandle = io.get('impulse.end');

    if (impulseEndCandle && this.trendStartCandle) {
      const [orderBlockCandle] = io.findCandlesBack(
        this.trendStartCandle.openTime,
        PARAMS.MAX_CANDLES_BACK,
        1,
        (candle) => candle.isGreen() !== this.trendStartCandle.isGreen()
      );
      if (orderBlockCandle) {
        this.magnets.add(
          orderBlockCandle.bodyCenter(),
          1,
          candle,
          Magnet.TYPES.ORDERBLOCK
        );
      }
      this.trendStartCandle = null;
    }

    const trendStartCandle = io.get('impulse.trend');
    if (trendStartCandle) this.trendStartCandle = trendStartCandle;

    /*
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

    */

    io.set(this.getId(), this.magnets);
  }
}

module.exports = MAGNETS;
