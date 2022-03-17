/*
** Indicator: Relative Strength Index (RSI)
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');
const RMA = require('../helpers/RMA.js');

class AnRSI extends AnalyzerIO {

        constructor(period) {
            super();
            this.name = 'rsi'+period;
            this.period = period;
        
            this.upGainRMA = new RMA(this.period);
            this.dnGainRMA = new RMA(this.period);

            this.prevCandle = null;
        }

        getId() {
            return this.name;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags);
            CDB.setSource(this.getId());

            if (! this.prevCandle) {
                this.prevCandle = candle;
                return;
            }

            let diff = candle.close - this.prevCandle.close;
            this.prevCandle = candle;

            let avgGainUp = 0;
            let avgGainDn = 0;

            if (diff > 0) {
                avgGainUp = this.upGainRMA.getRMA(diff);
                avgGainDn = this.dnGainRMA.getRMA(0);
            }
            else if (diff < 0) {
                avgGainUp = this.upGainRMA.getRMA(0);
                avgGainDn = this.dnGainRMA.getRMA(-1*diff);
            }
            else {
                avgGainUp = this.upGainRMA.getRMA(0);
                avgGainDn = this.dnGainRMA.getRMA(0);
            }

            
            let rsi = 100;
            if (avgGainDn !== 0) {
                const rs = avgGainUp / avgGainDn;
                rsi = 100 - (100 / (1 + rs));
            }
            /*
            if ( candle.timeframe === '1d' ) {
            console.log('RSI: ups.len='+this.upGains.length+' ups.avg='+avgUp+
            ' dns.len='+this.dnGains.length+' dns.avg='+avgDn+' RSI='+rsi)
            console.log(this.upGains);
            console.log(this.dnGains);
            }
*/

            flags.set(this.name, rsi);            
            CDB.offChart(candle,this.name,rsi);
        }


}

module.exports = AnRSI;
