const AnalyzerIO = require("../AnalyzerIO.js");
const CDB = require('../../types/CandleDebug.js');

class AnExtremum extends AnalyzerIO {

    constructor() {
        super();

        this.firstCandle = undefined;
        this.middleCandle = undefined;

    }

    getId() { return 'extremum'; }

    addCandle(candle, flags) {
        super.addCandle(candle, flags);
        CDB.setSource(this.getId());

        if (this.firstCandle === undefined) {
            this.firstCandle = candle;
            return;
        }

        if (this.middleCandle === undefined) {
            this.middleCandle = candle;
            return;
        }

        const first = this.firstCandle;
        const middle = this.middleCandle;
        
        this.firstCandle = this.middleCandle;
        this.middleCandle = candle;

        //console.log('CHECK_EXT: prev='+first.openTime+' mid='+middle.openTime+' cur='+candle.openTime);

        let highExtremum = middle.tailAbove(first) &&  middle.tailAbove(candle);
        let lowExtremum = middle.tailBelow(first) && middle.tailBelow(candle);
        
        if (! highExtremum && ! lowExtremum) { return; }
       
        let mainExtremum = ( highExtremum ? 'high' : 'low' );

        if ( highExtremum && lowExtremum ) {
            if ( (middle.open - middle.close) < 0) {
                mainExtremum = 'low';
            }
        }
    
        if (highExtremum) {
            CDB.circleHigh(middle, { color: 'green', radius: 0.5 } );
        }

        if (lowExtremum) {
            CDB.circleLow(middle, { color: 'red', radius: 0.5 });
        }
    
        //console.log('spotted extremum on mid='+middle.openTime);

        flags.set('extremum',{
            type: mainExtremum,
            high: highExtremum,
            low: lowExtremum,
            candle: middle
        });

    }

}

module.exports = AnExtremum;
