
const SETTINGS = require('../../private/private.js');

class CandleDebug {

    static source = 'none';

    static setSource(s) {
        this.source = s;
    }

    static onChart(candle, name, value, param = {}) {
        if (SETTINGS.noCandleDebug) { return; }
        const def = {
            type: 'onchart',
            name: name,
            value: value
        };
        let result = { ...def, ...param};
        candle.visualDebug.push( result );
    }

    static offChart(candle, name, value, param = {}) {
        if (SETTINGS.noCandleDebug) { return; }
        const def = {
            type: 'offchart',
            name: name,
            value: value
        };
        let result = { ...def, ...param};
        candle.visualDebug.push( result );
    }

    static circleHigh(candle, param = {}) {
        if (SETTINGS.noCandleDebug) { return; }
        const def = {
            type: 'circle',
            color: 'white',
            from: [ candle.openTime, candle.high ],
            radius: 1,
            src: this.source
        };
        let result = { ...def, ...param};
        candle.visualDebug.push( result );
    }

    static circleLow(candle, param = {}) {
        if (SETTINGS.noCandleDebug) { return; }
        let result = { ...param, ...{from: [ candle.openTime, candle.low ]} };
        this.circleHigh(candle, result);
    }

    static circleMiddle(candle, param = {}) {
        if (SETTINGS.noCandleDebug) { return; }
        let result = { ...param, ...{from: [ 
            candle.openTime,
            candle.low + (candle.high - candle.low) / 2 ]}
        };
        this.circleHigh(candle, result);
    }


    static horizontalBar(candle, fromY, toY, param = {} ) {
        if (SETTINGS.noCandleDebug) { return; }
        const def = {
            type: 'hbar',
            color: 'grey',
            alpha: '1.0',
            fromX: candle.openTime,
            fromY: fromY,
            toY: toY
        };
        let result = { ...def, ...param};
        candle.visualDebug.push( result );
    }

    static labelTop(candle, label) {
        if (SETTINGS.noCandleDebug) { return; }
        candle.visualDebug.push({
            type: 'label',
            position: 'top',
            label: label,
            src: this.source
        });        
    }

    static labelBottom(candle, label)
    {
        if (SETTINGS.noCandleDebug) { return; }
        candle.visualDebug.push({
            type: 'label',
            position: 'bottom',
            label: label,
            src: this.source
        });        
    }

    static entry(candle, entryPrice, takeProfit, stopLoss) {
        if (SETTINGS.noCandleDebug) { return; }
        candle.visualDebug.push({
            type: 'entry',
            src: 'entries',
            ep: entryPrice,
            tp: takeProfit,
            sl: stopLoss,
            by: this.source
        });        
    }

}

module.exports = CandleDebug;
