/*
** areas of value, autocentered ATR height
**
**
*/

const AnalayzerIO = require("./AnalayzerIO");
const CDB = require('../types/CandleDebug');

class Level {

    constructor(maxCandles) {
        this.maxCandles = maxCandles;
        this.points = [];
        this.y0 = undefined;
        this.y1 = undefined;
        this.resY0 = undefined;
        this.resY1 = undefined;
        this.countResist = 0;
        this.countSupport = 0;
        this.fromX = 0;
        this.totalWeight = 0;
        this.supportWeight = 0;
        this.resistWeight = 0;
    }

    addPoint(time,level,bounceUp,height,weight) {
        const wasPoint = this.points.find( p => p.time === time );
        if (wasPoint) { return; }
        
        const point = {
            time: time,
            level: level,
            bounceUp: bounceUp,
            height: height,
            weight: weight
        };
        
        this.points.push(point);
        this.recalcLevel();
    }

    toJSON() {
        return {
            y0: this.resY0,
            y1: this.resY1,
            r: this.countResist,
            s: this.countSupport,
            rW: this.resistWeight,
            sW: this.supportWeight,
            x0: this.fromX,
            w: this.totalWeight,
            alpha: Math.min(0.8,this.totalWeight/200)
        };
    }

    getTotalWeight() {
        return this.totalWeight;
    }

    isWorthy() {
        return true;
  /*
        if ( this.totalWeight >= this.maxCandles / 50 ) {
            return true;
        }

        return false;*/
    }

    inLevel(y) {
        if ( (this.y0 == undefined) || (this.y1 == undefined)) {
            return false;
        }

        return (y >= this.y0) && (y <= this.y1 );
    }

    inLevelExact(y) {
        if ( (this.resY0 == undefined) || (this.resY1 == undefined)) {
            return false;
        }

        return (y >= this.resY0) && (y <= this.resY1 );
    }


    recalcLevel() {
        const count = this.points.length;
        let height = 0;
        let level = 0;
        this.countResist = 0;
        this.countSupport = 0;
        this.fromX = this.points[0].time;
        this.totalWeight = 0;
        this.supportWeight = 0;
        this.resistWeight = 0;

        this.points.forEach( (p) => {
            height += p.height;
            level += p.level;
            this.totalWeight += p.weight;
            if (p.bounceUp) {
                this.countSupport++;
                this.supportWeight+=p.weight;
            }
            else {
                this.countResist++;
                this.resistWeight+=p.weight;
            }
        });

        const yMiddle = level / count;
        const avgHeight = height / count;

        this.y0 = yMiddle - avgHeight/2;
        this.y1 = yMiddle + avgHeight/2;

        this.resY0 = yMiddle - avgHeight/4;
        this.resY1 = yMiddle + avgHeight/4;
        
    }

    forgetBefore(time) {
        const countBefore = this.points.length;
        this.points = this.points.filter( (p) => p.time > time );
        
        if (this.points.length <= 0 ) {
            return false;
        }

        if (countBefore > this.points.length) {
            this.recalcLevel();
        }

        return true;
    }

}


class AnVLevels extends AnalayzerIO {

        constructor(maxCandles) {
            super();
            this.levels = [];
            this.maxCandles = maxCandles;
        }

        addCandle(candle,flags) {
            super.addCandle(candle,flags)
            CDB.setSource('vlevels');

            const extremum = flags.get('extremum');            
            const atr = flags.get('atr14');
            
            const hillLow = flags.get('hills.new.low');
            if (hillLow) {
                this.addBounceLevel(true,
                    hillLow.openTime,
                    hillLow.low,
                    atr,
                    30);
            }

            const hillHigh = flags.get('hills.new.high');
            if (hillHigh) {
                this.addBounceLevel(false,
                    hillHigh.openTime,
                    hillHigh.high,
                    atr,
                    30);
            }

            let extremumCandle = flags.get('hl_trend.new.high');
            if ( extremumCandle ) {
                this.addBounceLevel(false,
                     extremumCandle.openTime,
                     extremumCandle.high,
                     atr, 10);
            }

            extremumCandle = flags.get('hl_trend.new.low');
            if ( extremumCandle ) {
                this.addBounceLevel(true,
                     extremumCandle.openTime,
                     extremumCandle.low,
                     atr, 10);
            }

            flags.set('vlevels', this);
            flags.set('vlevels_high', flags.getHTF('vlevels'));
            
        }

        toJSON() {
            let levels = [];
            this.levels.forEach( (l) => {
                if (l.isWorthy()) {
                    levels.push(l.toJSON())
                }
            });
            return levels;
        }

        addBounceLevel(bounceUp, time, y, atr, weight) {
            let wasFound = false;
            for (const l of this.levels)
            {
                if (l.inLevel(y)) {
                    l.addPoint(time,y,bounceUp,atr,weight);
                    wasFound = true;
                }
            }
            if (wasFound || weight < 30) {
                return;
            }
            const newLevel = new Level(this.maxCandles);
            newLevel.addPoint(time,y,bounceUp,atr,weight);
            this.levels.push(newLevel);
        }

        forgetBefore(time) {
            const countBefore = this.levels.length;
            this.levels = this.levels.filter( (l) => l.forgetBefore(time) );
        }


        getCandleResistTouchWeight(candle)
        {
            let weight = 0;

            this.levels.forEach( (l) => {

                if (    l.inLevelExact(candle.bodyLow()) 
                    ||  l.inLevelExact(candle.low)
                ) {
                    weight += l.getTotalWeight();
                }
            })

            return weight;
        }



}


module.exports = AnVLevels;
