/*
** Hoffman Overlay Set Trend Indicator
** flags: hos = N | UP | DN
*/

const CDB = require('../../../types/CandleDebug');
const RMA = require('../helpers/RMA.js');
const Analyzer = require("../types/Analyzer");

/*

// Created By UCSGEARS
// Based on Videos from youtube, by Rob Hoffman

study("Rob Hoffman - Overlay Set", shorttitle = "RH - MAs", overlay = true)

X - a = sma(close,3)
X - h = sma(close,200)

b = sma(close,5)
c = ema(close,18)

d = ema(close,20)
e = sma(close,50)
f = sma(close,89)
g = ema(close,144)
k = ema(close,35)
r = rma(tr,35)
ku = k + r*0.5
kl = k - r*0.5

X - plot(a, title = "Fast Speed Line", linewidth = 2, color = #0000FF)
plot(b, title = "Slow Speed Line", linewidth = 2, color = fuchsia)
plot(c, title = "Fast Primary Trend Line", linewidth = 3, color = #00FF00)
plot(d, title = "Slow Primary Trend Line", linewidth = 3, color = #000000)
plot(e, title = "Trend Line - 1", linewidth = 3, color = #0000FF, style = circles)
W - plot(f, title = "Trend Line - 2", linewidth = 3, color = #20B2AA)
plot(g, title = "Trend Line - 3", linewidth = 3, color = #FF4500)
X - plot(h, title = "Trend Line - 4", linewidth = 3, color = fuchsia)

W - plot(k, title = "No Trend Zone - Midline", linewidth = 2, color = #3CB371)
W - plot(ku, title = "No Trend Zone - Upperline", linewidth = 2, color = #3CB371)
W - plot(kl, title = "No Trend Zone - Lowerline", linewidth = 2, color = #3CB371)

*/


class HOS extends Analyzer {

      constructor() {
            super();
            this.prevCandle = null;
            this.rma35range = new RMA(35);
        }

        getId() { return 'hos'; }

        init(io)
        {
            io.require('mac5');
            io.require('emac18');

            io.require('emac20');
            io.require('mac50');
            io.require('mac89');
            io.require('emac144');
            io.require('emac35');

        }

        trueRange(thisCandle) {
            let prevCandle = this.prevCandle;
            if (! prevCandle ) { prevCandle = thisCandle; };
            return Math.max(
                (thisCandle.high - thisCandle.low),
                Math.abs(thisCandle.high - prevCandle.close),
                Math.abs(thisCandle.low - prevCandle.close)
            );
        }

        addCandle(candle,io) {
            super.addCandle(candle,io);
            CDB.setSource(this.getId());

            const r = this.rma35range.getRMA(this.trueRange(candle));
            this.prevCandle = candle;

            const fast = io.get('mac5');
            const slow = io.get('emac18');
            const k = io.get('emac35');
            const ku = k + r*0.5;
            const kl = k - r*0.5;

            //CDB.onChart(candle, 'ku', ku);
            //CDB.onChart(candle, 'kl', kl);

            const other = [
                io.get('emac20'),
                io.get('mac50'),
                io.get('mac89'),
                io.get('emac144'),
                k, ku, kl
            ];
            
            let res = 'N';

            if (this.uptrend(candle,fast,slow,other)) {
                res = 'UP';
            }
            else if (this.downtrend(candle,fast,slow,other)) {
                res = 'DN';
            }

            io.set(this.getId(),res);
      
        }

        uptrend(candle,fast,slow,other) {
            // order from up to down: candle.close, fast, slow, other
            if (slow >= fast) { return false; }
            if (candle.low <= fast ) { return false; }
            if ( other.filter( l => l >= slow ).length ) { return false; }
            return true; 
        }

        downtrend(candle,fast,slow,other) {
            // order from down to up: candle.close, fast, slow, other
            if (slow <= fast) { return false; }
            if (candle.high >= fast ) { return false; }
            if ( other.filter( l => l <= slow ).length ) { return false; }
            
            return true;             
        }
   
}

module.exports = HOS;
