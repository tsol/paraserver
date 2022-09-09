/*
**  Indicator: hills - detects noticible hill tops and botoms (extremums).
**  Depends on: mac20, hl_trend, atr14
**
**  Generates flags:
**
**      hills.new.low = candle_object - just found hill bottom
**      hills.new.high = candle_object - just found hill top
**
**  New hill is never current candle. This indicator can tell the extremum
**  by detecting noticable decline or incline in moving avarage 20 indicator.
**
*/

const Analyzer = require("../types/Analyzer");


class AnHills extends Analyzer {

    constructor() {
        super();
        this.followMac = 'mac20';

        this.prevMac = undefined;
        this.prevDelta = undefined;
        this.deltaSwitchLevel = undefined;

        this.prevTopCandle = undefined;
        this.prevBottomCandle = undefined;
    }

    init(io)
    {
        io.require('atr14');
        io.require(this.followMac);
        io.require('extremum');
    }

    getId() { return 'hills'; }

    addCandle(candle, io) {
        super.addCandle(candle, io);
        
        io.cdb().setSource(this.getId());

        const atr = io.get('atr14');
        const mac = io.get(this.followMac);

        if ( ! atr || ! mac) {
            return false;
        }

        const currentMac = mac;

        if (this.deltaSwitchLevel == undefined) {
            this.deltaSwitchLevel = currentMac;
        }

        const extrem = io.get('extremum');

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
                        io.cdb().circleHigh( this.prevTopCandle, { radius: 2, color: 'pink' } );
                        io.set('hills.new.high', this.prevTopCandle);
                    }
                    this.prevTopCandle = undefined;
                    this.prevBottomCandle = undefined;
                }
                else if (direction > 0) {
                    if (this.prevBottomCandle) {
                        io.cdb().circleLow( this.prevBottomCandle, { radius: 2, color: 'pink' } );
                        io.set('hills.new.low', this.prevBottomCandle);
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
