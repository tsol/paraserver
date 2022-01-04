/*
**  More humanly readable extremums.
**  depends on mac and hl_trend and atr
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');

class AnHills extends AnalyzerIO {

    constructor() {
        super();
        this.followMac = 'mac20';

        this.prevMac = undefined;
        this.prevDelta = undefined;
        this.deltaSwitchLevel = undefined;

        this.prevTopCandle = undefined;
        this.prevBottomCandle = undefined;
    }

    getId() { return 'hills'; }

    addCandle(candle, flags) {
        super.addCandle(candle, flags);
        
        CDB.setSource(this.getId());

        const currentMac = flags.get(this.followMac);
        const atr = flags.get('atr14');

        if (this.deltaSwitchLevel == undefined) {
            this.deltaSwitchLevel = currentMac;
        }

        const extrem = flags.get('extremum');

        if (extrem && extrem.high) {
                if (this.prevTopCandle == undefined) {
                    this.prevTopCandle = extrem.candle;
                }
                else if (extrem.candle.tailAbove(this.prevTopCandle)) {
                    this.prevTopCandle = extrem.candle;
                }
        }


        if (extrem && extrem.low) {
            if (this.prevBottomCandle == undefined) {
                this.prevBottomCandle = extrem.candle;
            }
            else if (extrem.candle.tailBelow(this.prevBottomCandle)) {
                this.prevBottomCandle = extrem.candle;
            }
        }


        if (this.prevMac === undefined) {
            this.prevMac = currentMac;
            return;
        }
        
        const delta = currentMac - this.prevMac;
        const direction = Math.sign(delta);

        if (direction !== Math.sign(this.prevDelta)) {
            
            const swingLevel = Math.abs(this.deltaSwitchLevel - currentMac);

            if (swingLevel > atr/2) {

                // new direction is down
                if (direction < 0) {
                    if (this.prevTopCandle) {
                        CDB.circleHigh( this.prevTopCandle, { radius: 2, color: 'pink' } );
                        flags.set('hills.new.high', this.prevTopCandle);
                    }
                    this.prevTopCandle = undefined;
                    this.prevBottomCandle = undefined;
                }
                else if (direction > 0) {
                    if (this.prevBottomCandle) {
                        CDB.circleLow( this.prevBottomCandle, { radius: 2, color: 'pink' } );
                        flags.set('hills.new.low', this.prevBottomCandle);
                    }
                    this.prevBottomCandle = undefined;
                    this.prevTopCandle = undefined;
                }

            }

            this.deltaSwitchLevel = currentMac;

        }

        this.prevDelta = delta;
        this.prevMac = currentMac;

    }

}

module.exports = AnHills;
