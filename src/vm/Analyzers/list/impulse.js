/*
 ** Impulse candle
 **
 ** returns  impulse.gap = { y0, y1, candle }           - price unfair gap inside of tall impulse candle
 ** returns  impulse.tall = tallImpulseCandle
 ** returns  impulse.candle = impulseCandle
 **          impulse.start = startImpulseCandle
 **          impulse.end = lastImpulseCandle
 */

const RMA = require('../helpers/RMA');
const Analyzer = require('../types/Analyzer');
const { fnum } = require('../../../reports/helper');

class IMPULSE extends Analyzer {
  static AVG_CANDLES = 5;
  static START_MULT = 2;
  static END_MULT = 0.5;
  static ATR_MULT = 1.5;

  constructor() {
    super();
    this.rma = new RMA(IMPULSE.AVG_CANDLES);
    this.isInImpulse = false;
    this.prevCandleWasTall = false;
    this.prevPrevCandle = null;
    this.prevCandle = null;
  }

  init(io) {
    io.require('atr14');
  }

  getId() {
    return 'impulse';
  }

  addCandle(candle, io) {
    super.addCandle(candle, io);
    io.cdb().setSource(this.getId());
    const res = {};

    const prevAvg = this.rma.getRMA(candle.volume);

    if (this.isInImpulse) {
      if (candle.volume / IMPULSE.END_MULT < prevAvg) {
        io.cdb().labelBottom(candle, 'xM');
        this.isInImpulse = false;
      } else if (this.prevCandle && this.prevCandle.isRed() != candle.isRed()) {
        io.cdb().labelBottom(candle, 'xS');
        this.isInImpulse = false;
      }
      if (!this.isInImpulse) {
        res['impulse.end'] = this.prevCandle;
      }
    }

    if (!this.isInImpulse) {
      if (candle.volume / IMPULSE.START_MULT > prevAvg) {
        this.isInImpulse = true;
        res['impulse.start'] = candle;
      }
    }

    let isTallCandle = false;

    if (this.isInImpulse) {
      isTallCandle = candle.bodySize() / IMPULSE.ATR_MULT > io.get('atr14');

      if (candle.isRed()) {
        io.cdb().labelTop(candle, 'V');
        if (isTallCandle)
          io.cdb().circleMiddle(candle, { color: 'red', radius: 3 });
      } else {
        io.cdb().labelBottom(candle, '^');
        if (isTallCandle)
          io.cdb().circleMiddle(candle, { color: 'green', radius: 3 });
      }
    }

    if (this.isInImpulse) {
      res['impulse.candle'] = candle;
    }

    if (isTallCandle) {
      res['impulse.tall'] = candle;
    }

    // finding GAP of inequity
    if (this.prevCandleWasTall && this.prevPrevCandle) {
      let gapY0, gapY1;
      if (this.prevCandle.isGreen()) {
        gapY0 = this.prevPrevCandle.high;
        gapY1 = candle.low;
      } else {
        gapY1 = this.prevPrevCandle.low;
        gapY0 = candle.high;
      }

      if (gapY1 > gapY0) {
        res['impulse.gap'] = {
          y0: gapY0,
          y1: gapY1,
          candle: this.prevCandle,
        };
      }
    }

    this.prevPrevCandle = this.prevCandle;
    this.prevCandle = candle;
    this.prevCandleWasTall = isTallCandle;

    for (const [key, value] of Object.entries(res)) {
      io.set(key, value);
    }
  }
}

module.exports = IMPULSE;
