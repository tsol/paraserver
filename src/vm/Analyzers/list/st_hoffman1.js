/*
** Hoffman retracing bar strategy (https://www.youtube.com/watch?v=uzU-55eSWIk&t=45s)
**
** TODO: 

1. trailing stop loss using touch of MA
2. try to use 45 degrees approach

**
*/

const Strategy = require("../types/Strategy");

const RMA = require('../helpers/RMA.js');

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


class HOFFMAN extends Strategy {

    static ENTRY_PIPS = 5;
    //static ENTRY_ATR = 0.3;
    static STOP_PIPS = 0;

      constructor() {
            super();
            this.prevCandle = null;
            this.rma35range = new RMA(35);
        }

        getId() { return 'hoffman1'; }

        init(io)
        {
            io.require('mac5');
            io.require('emac18');

            io.require('emac20');
            io.require('mac50');
            io.require('mac89');
            io.require('emac144');
            io.require('emac35');

            //io.require('atr14');
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

        retracementBullish(candle) {
            return candle.lowerTailSize() > candle.totalSize() * 0.45;
        }

        retracementBearish(candle) {
            return candle.upperTailSize() > candle.totalSize() * 0.45;
        }


        addCandle(candle,io) {
            super.addCandle(candle,io);
            io.cdb().setSource(this.getId());

            const r = this.rma35range.getRMA(this.trueRange(candle));
            this.prevCandle = candle;

            // todo: check if retracement candle
            let bearish = this.retracementBearish(candle);
            let bullish = this.retracementBullish(candle);

            if (! bearish && ! bullish) { return; }

            const fast = io.get('mac5');
            const slow = io.get('emac18');
            const k = io.get('emac35');
            const ku = k + r*0.5;
            const kl = k - r*0.5;

            io.cdb().onChart(candle, 'ku', ku);
            io.cdb().onChart(candle, 'kl', kl);

            const other = [
                io.get('emac20'),
                io.get('mac50'),
                io.get('mac89'),
                io.get('emac144'),
                k, ku, kl
            ];
            
            if (! this.pip ) {
                this.pip = io.getSymbolInfo(candle.symbol).tickSize; 
            }

            //const atr = io.get('atr14');
            //if (! atr ) { return; }

            if (bearish) {
                io.cdb().labelBottom(candle,'^')
                if (this.uptrend(candle,fast,slow,other)) {
                    io.cdb().labelTop(candle,'E')

                    io.makeEntry(this, 'buy', {
                        entryPrice: candle.high + HOFFMAN.ENTRY_PIPS * this.pip,
                        rrRatio: 1.5,
                        //stopLoss: fast
                        stopLoss: candle.low - HOFFMAN.STOP_PIPS * this.pip,
                    });
                    
                    return;
                }
                
            }


            if (bullish) {
                io.cdb().labelTop(candle,'v')
                if (this.downtrend(candle,fast,slow,other)) {
                    io.cdb().labelBottom(candle,'E')

                    io.makeEntry(this, 'sell', {
                        entryPrice: candle.low - HOFFMAN.ENTRY_PIPS * this.pip,
                        rrRatio: 1.5,
                        //stopLoss: fast
                        stopLoss: candle.high + HOFFMAN.STOP_PIPS * this.pip,
                    });
                    
                }
                return;
            }
      
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

module.exports = HOFFMAN;
