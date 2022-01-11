/*
** areas of value, autocentered ATR height
**
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');
const { TF } = require('../../types/Timeframes.js');

class AnVLevels extends AnalyzerIO {

        constructor() {
            super();
            this.levels = [];
        }

        getId() { return 'vlevels'; }

        addCandle(candle,flags) {
            super.addCandle(candle,flags)
            CDB.setSource(this.getId());

            /* cut levels from begining */
            const cutSince = candle.openTime - TF.getLevelLimitTime(candle.timeframe);
            /*
            console.log('ANVLEVEL: cut since: '+cutSince+' = '+TF.timestampToDate(cutSince)
            +' LLT='+TF.getLevelLimitTime(candle.timeframe)+' OT='+candle.openTime
            + ' timeframe='+candle.timeframe);
            */
            this.forgetBefore(cutSince);

            const extremum = flags.get('extremum');            
            const atr = flags.get('atr14');
            
            const hillLow = flags.get('hills.new.low');
            if (hillLow) {
                this.addBounceLevel(true,
                    hillLow.openTime,
                    hillLow.low,
                    atr,
                    30, hillLow);
            }

            const hillHigh = flags.get('hills.new.high');
            if (hillHigh) {
                this.addBounceLevel(false,
                    hillHigh.openTime,
                    hillHigh.high,
                    atr,
                    30, hillHigh);
            }

            let extremumCandle = flags.get('hl_trend.new.high');
            if ( extremumCandle ) {
                this.addBounceLevel(false,
                     extremumCandle.openTime,
                     extremumCandle.high,
                     atr, 10, extremumCandle);
            }

            extremumCandle = flags.get('hl_trend.new.low');
            if ( extremumCandle ) {
                this.addBounceLevel(true,
                     extremumCandle.openTime,
                     extremumCandle.low,
                     atr, 10, extremumCandle);
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

        addBounceLevel(bounceUp, time, y, atr, weight, candle) {
            let wasFound = false;
            for (const l of this.levels)
            {
                if (l.inLevel(y)) {
                    l.addPoint(time,y,bounceUp,atr,weight, candle);
                    wasFound = true;
                }
            }
            if (wasFound || weight < 30) {
                return;
            }
            const newLevel = new Level();
            newLevel.addPoint(time,y,bounceUp,atr,weight,candle);
            this.levels.push(newLevel);
        }

        forgetBefore(time) {
            const countBefore = this.levels.length;
            this.levels = this.levels.filter( (l) => l.forgetBefore(time) );
        }


        findUpperTarget({startPrice, maxPrice, reqWTotal, reqWSupport, reqWResist }) {

            let upperLowerEdge = 0;

            for (let lvl of this.levels) {

                let lowerEdge = lvl.getExactLowerEdge();
                
                if ( (lowerEdge > startPrice) && (lowerEdge < maxPrice)) {
                    
                    if (reqWTotal && (reqWTotal > lvl.totalWeight)) continue;
                    if (reqWSupport && (reqWSupport > lvl.supportWeight)) continue;
                    if (reqWResist && (reqWResist > lvl.resistWeight)) continue;
                    
                    if (lowerEdge > upperLowerEdge) {
                        upperLowerEdge = lowerEdge;
                    }
                }

            }     
            return upperLowerEdge;
        }


        getCandleBottomTouch(candle)
        {
            let resistWeight = 0;
            let supportWeight = 0;

            this.levels.forEach( (l) => {

                if (    l.inLevelExact(candle.bodyLow()) 
                    ||  l.inLevelExact(candle.low)
                ) {
                    resistWeight += l.resistWeight;
                    supportWeight += l.supportWeight;
                }
            })

            return {
                rw: resistWeight,
                sw: supportWeight
            };
        }


}


class Level {

    constructor() {
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

    addPoint(time,level,bounceUp,height,weight,candle) {
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
        
        const debugMsg = '['+this.supportWeight+'/'+this.resistWeight+']';

        if (bounceUp) {
            CDB.labelBottom(candle,debugMsg);
        } else {
            CDB.labelTop(candle,debugMsg);
        }
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

    getExactLowerEdge() {
        return this.resY0;
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


module.exports = AnVLevels;
