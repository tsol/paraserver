/*
** Live Candles Sequence Pulse
**
*/

const BrokerEventsCandlesInterface = require('../brokers/types/BrokerEventsCandlesInterface.js');

const { TF } = require('../types/Timeframes.js');
const TH = require('../helpers/time.js');

class LivePulser extends BrokerEventsCandlesInterface {

    constructor (symbols, timeframes, candleSequencer)
    {
      this.symbols = symbols;
      this.timeframes = timeframes;
      this.sequnecer = candleSequencer;

      this.currentCloseTime = null;
      this.arrived = {};
      this.expecting = {};
    }

    updateSymbols(symbols) {
      this.symbols = symbols;
    }

    pulseStart(closeTime)
    {
      this.currentCloseTime = closeTime;

      this.arrived = {};
      this.expecting = {};

      let expectTimeframes = [];
      this.timeframes.forEach( t => {
        if ( (closeTime+1) % TF.get(t).length > 0) { expectTimeframes.push(t); }
      });

      for (var s of this.symbols) {
        for (var t of expectTimeframes) {
          this.expecting[ s+'-'+t ] = true;
        }
      }

      console.log('PLSR: pulseStart '+TH.ls(closeTime)+', expecting: '+
        Object.keys(this.expecting).join(', '));

    }

    pulseRelease()
    {
      this.sequnecer.livePulse(this.currentCloseTime,this.arrived,this.expecting);
    }


/*
    1. if newer candle.closeTime arrives:
      - release old pulse (call processor with all data)
      - if some of the timeframes were not filled - exclude symbol
      - start new pulse

    2. start new pulse
      - calculate which timeframes to expect
      - set timeout to several seconds
      - start receiving newCandle's filling all timeframs
      - once all timeframes filled - release pulse (call processor)

*/

    newCandleFromBroker(candle,eventTime)
    {

      if (! candle.closed ) {
        this.sequnecer.livePriceUpdate(candle,eventTime);
        return;
      }

      if (this.currentCloseTime == null) {
        this.pulseStart(candle.closeTime);
      }
      else if (this.currentCloseTime < candle.closeTime) {
        console.log('PLSR: [WARN] releasing pulse because of new pulse commin')
        this.pulseRelease();
        this.pulseStart(candle.closeTime);
      }

      const key = candle.symbol+'-'+candle.timeframe;

      if (! this.expecting[ key ]) {
        throw new Error('PLSR: was not expecting timeframe');
      }

      this.arrived[key] = candle;
      delete this.expecting[key];

      // last expected candle on pulse arrived:
      if (Object.keys(this.expecting).length == 0) {
        this.pulseRelease();
        this.currentCloseTime = null;
      }

    }


}


module.exports = LivePulser;