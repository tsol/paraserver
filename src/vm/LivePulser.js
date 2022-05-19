/*
** Live Candles Sequence Pulse
**
*/

const BrokerEventsCandlesInterface = require('../brokers/types/BrokerEventsCandlesInterface.js');

const { TF } = require('../types/Timeframes.js');
const TH = require('../helpers/time.js');

class LivePulser extends BrokerEventsCandlesInterface {

    static PULSE_WAIT_TIMEOUT = 2000;

    constructor (symbols, timeframes, pulseTF, candleSequencer)
    {
      super();
      this.symbols = symbols;
      this.timeframes = timeframes;
      this.pulseTF = pulseTF;
      this.sequencer = candleSequencer;

      this.currentPulseTime = null;
      this.prevPulseTime = null;
      this.arrived = {};
      this.expecting = {};

      this.bufferedPulses = [];
      this.bufferedPriceUpdates = [];

      this.pulseTimeout = null;

      this.isLive = false;
    }

    switchLive() { 

      this.isLive = true;
    
      if (this.bufferedPulses.length > 0) {
        console.log('PLSR: releasing pulses from cache:');
        this.bufferedPulses.forEach( p => {
 
          console.log('PLSR: cached pulse '+TH.ls(p.pulseTime));
          
          p.priceUpdates.forEach( pu =>
            this.sequencer.livePriceUpdate(pu.candle,pu.eventTime)
          );

          this.sequencer.livePulse(p.pulseTime,p.arrived);

        });
      }

      console.log('CSEQ: cached pulses done, releasing buffered live candles if any:');

      this.releaseBufferedCandles();

    }

    updateSymbols(symbols) {
      this.symbols = symbols;
    }

  
    pulseStart(pulseTime)
    {

      if (this.isLive) {
        var _self = this;
        this.pulseTimeout = setTimeout( function() {
          console.log('PLSR: [WARN] timeout on pulse gathering...');
          _self.pulseRelease()
        }, LivePulser.PULSE_WAIT_TIMEOUT);
      }

      this.currentPulseTime = pulseTime;

      this.arrived = {};
      this.expecting = {};

      let expectTimeframes = [];
      this.timeframes.forEach( t => {
        if ( (pulseTime+1) % TF.get(t).length == 0) { expectTimeframes.push(t); }
      });

      for (var s of this.symbols) {
        for (var t of expectTimeframes) {
          this.expecting[ s+'-'+t ] = true;
        }
      }

      console.log('PLSR: pulseStart '+TH.ls(pulseTime)+' ('+pulseTime+'), waiting for: '+
        Object.keys(this.expecting).join(', '));

    }

    pulseRelease()
    {

      if (this.pulseTimeout) {
        clearTimeout(this.pulseTimeout);
        this.pulseTimeout = null;
      }

      // remove timeouted symbols

      const missedTickers = Object.keys(this.expecting);
      if (missedTickers.length>0) {
          missedTickers.forEach( key => {
              const symbol = key.split('-')[0];
              this.sequencer.removeSymbol( symbol );
          });
          this.symbols = this.sequencer.getSymbols();
      }

      if (! this.isLive ) {
        console.log('PLSR: pulse store to cache '+TH.ls(this.currentPulseTime));

        const priceUpdates = this.bufferedPriceUpdates
          .filter( pu => pu.eventTime <= this.currentPulseTime );

        this.bufferedPriceUpdates = this.bufferedPriceUpdates.
          filter( pu => pu.eventTime > this.currentPulseTime );
        
        this.bufferedPulses.push({
            pulseTime: this.currentPulseTime,
            arrived: this.arrived,
            priceUpdates
        });

        this.currentPulseTime = null;
        return;
      }

      this.sequencer.livePulse(this.currentPulseTime,this.arrived);
      this.releaseBufferedCandles();
  
      this.prevPulseTime = this.currentPulseTime;
      this.currentPulseTime = null;

    }

    releaseBufferedCandles()
    {
      if (this.isLive && this.bufferedPriceUpdates.length > 0) {
        console.log('PLSR: releasing buffered candles:')
        this.bufferedPriceUpdates.forEach( pu => {
            this.sequencer.livePriceUpdate(pu.candle,pu.eventTime);
          });
        this.bufferedPriceUpdates = [];
        console.log('PLSR: release done')
      }

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

    isGatheringPulse() {
      return this.currentPulseTime != null;
    }

    newCandleFromBroker(candle,eventTime)
    { 
      if (! candle.closed ) {

        // only care for pulse timeframe (smallest) as price updates
        if ( !this.isLive || (candle.timeframe != this.pulseTF)) { return; }

        if ( ! this.isGatheringPulse() || (eventTime <= this.currentPulseTime)) {
            this.sequencer.livePriceUpdate(candle,eventTime);
            return;
        }
        
        this.bufferedPriceUpdates.push({eventTime,candle});
        return;
      }

      // closed candle arrived

      // when not live we collect pulse timeframe candles as price updates
      if ( !this.isLive && (candle.timeframe == this.pulseTF)) {
          this.bufferedPriceUpdates.push({eventTime:candle.closeTime,candle}); 
      }

      const key = candle.symbol+'-'+candle.timeframe;

      if (! this.isGatheringPulse()) {
        if (! this.prevPulseTime || ( candle.closeTime > this.prevPulseTime )) {
          this.pulseStart(candle.closeTime);
        }
        else {
          console.log('PLSR: [WARN] late candle arrived: '+key);
          return;
        }
      }
      else if (candle.closeTime > this.currentPulseTime) {
        console.log('PLSR: [WARN] releasing pulse because of new pulse commin')
        this.pulseRelease();
        this.pulseStart(candle.closeTime);
      }
 
      if (! this.expecting[ key ]) {
        return;
      }

      this.arrived[key] = candle;
      delete this.expecting[key];

      // last expected candle on pulse arrived:
      if (Object.keys(this.expecting).length == 0) {
        this.pulseRelease();
      }

    }


}


module.exports = LivePulser;