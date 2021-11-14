class CandleDebug {

    static source = 'none';

    static setSource(s) {
        this.source = s;
    }

    static onChart(candle, name, value, param = {}) {
        const def = {
            type: 'onchart',
            name: name,
            value: value
        };
        let result = { ...def, ...param};
        candle.visualDebug.push( result );
    }

    static offChart(candle, name, value, param = {}) {
        const def = {
            type: 'offchart',
            name: name,
            value: value
        };
        let result = { ...def, ...param};
        candle.visualDebug.push( result );
    }

    static circleHigh(candle, param = {}) {
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
        let result = { ...param, ...{from: [ candle.openTime, candle.low ]} };
        this.circleHigh(candle, result);
    }

    static circleMiddle(candle, param = {}) {
        let result = { ...param, ...{from: [ 
            candle.openTime,
            candle.low + (candle.high - candle.low) / 2 ]}
        };
        this.circleHigh(candle, result);
    }


    static horizontalBar(candle, fromY, toY, param = {} ) {
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
        candle.visualDebug.push({
            type: 'label',
            position: 'top',
            label: label,
            src: this.source
        });        
    }

    static labelBottom(candle, label)
    {
        candle.visualDebug.push({
            type: 'label',
            position: 'bottom',
            label: label,
            src: this.source
        });        
    }

}

module.exports = CandleDebug;
