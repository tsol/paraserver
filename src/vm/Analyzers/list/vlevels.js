/*
** areas of value, autocentered ATR height
**
**
*/

const Analyzer = require("../types/Analyzer");

const { TF } = require('../../../types/Timeframes.js');

class AnVLevels extends Analyzer {

        constructor() {
            super();
            this.levels = [];
            this.levelId = 0;
        }

        getId() { return 'vlevels'; }

        init(io)
        {
            io.require('hl_trend');
            io.require('hills');
            io.require('extremum');
        }

        addCandle(candle,io) {
            super.addCandle(candle,io)
            io.cdb().setSource(this.getId());

            /* cut levels from begining */
            const cutSince = candle.openTime - TF.getLevelLimitTime(candle.timeframe);
            this.forgetBefore(cutSince);

            const extremum = io.get('extremum');            
            const atr = io.get('atr14');
            
            const hillLow = io.get('hills.new.low');
            if (hillLow) {
                this.addBounceLevel(true, hillLow.openTime, hillLow.low,
                    atr, 30, hillLow);
            }

            const hillHigh = io.get('hills.new.high');
            if (hillHigh) {
                this.addBounceLevel(false, hillHigh.openTime, hillHigh.high,
                    atr, 30, hillHigh);
            }

            let extremumCandle = io.get('hl_trend.new.high');
            if ( extremumCandle ) {
                this.addBounceLevel(false, extremumCandle.openTime, extremumCandle.high,
                     atr, 10, extremumCandle);
            }

            extremumCandle = io.get('hl_trend.new.low');
            if ( extremumCandle ) {
                this.addBounceLevel(true, extremumCandle.openTime, extremumCandle.low,
                     atr, 10, extremumCandle);
            }

            io.set('vlevels', this);
            io.set('vlevels_high', io.getHTF('vlevels'));
            
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
            this.levelId++;
            const newLevel = new Level(this.levelId);
            newLevel.addPoint(time,y,bounceUp,atr,weight,candle);
            this.levels.push(newLevel);
            if (bounceUp) {
                io.cdb().labelBottom(candle,'NL='+this.levelId);
            } else {
                io.cdb().labelTop(candle,'NL='+this.levelId);
            }
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


        getBottomTouchWeights(candle,olderThan)
        {
            let resistWeight = 0;
            let supportWeight = 0;
            let levelIds = [];

            const levels = ( olderThan ? 
                this.levels.filter(l => l.fromX < olderThan ) : this.levels );

            levels.forEach( (l) => {
                if (  l.inLevelExact(candle.low) ) {
                    resistWeight += l.resistWeight;
                    supportWeight += l.supportWeight;
                    levelIds.push(l.getId());
                }
            })

            return {
                rw: resistWeight,
                sw: supportWeight,
                ids: levelIds
            };
        }

        getTopTouchWeights(candle,olderThan)
        {
            let resistWeight = 0;
            let supportWeight = 0;
            let levelIds = [];

            const levels = ( olderThan ? 
                this.levels.filter(l => l.fromX < olderThan ) : this.levels );

            levels.forEach( (l) => {
                if (l.inLevelExact(candle.high)) {
                    resistWeight += l.resistWeight;
                    supportWeight += l.supportWeight;
                    levelIds.push(l.getId());
                }
            })

            return {
                rw: resistWeight,
                sw: supportWeight,
                ids: levelIds
            };
        }


        exactPriceMatch(arrayOfPrices)
        {
            //console.log('VL: searching '+JSON.stringify(arrayOfPrices)+' in ');
            

            this.levels.forEach( (lvl) => {
                
                //console.log(lvl.getPrices());

                arrayOfPrices.forEach( (p) => {
                    if ( lvl.getPrices().includes(p) ) {
                        return p;
                    }
                });
            })

            return null;
        }



}


class Level {

    constructor(id) {
        this.points = [];
        this.id = id;
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
        this.prices = []; // all prices forming level cached here
    }

    getId() { return this.id; };
    
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
            io.cdb().labelBottom(candle,debugMsg);
        } else {
            io.cdb().labelTop(candle,debugMsg);
        }
    }

    toJSON() {
        return {
            i: this.id,
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

    getPrices() {
        return this.prices;
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
        this.prices = [];

        this.points.forEach( (p) => {
            height += p.height;
            level += p.level;
            this.totalWeight += p.weight;
            this.prices.push(p.level);
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
