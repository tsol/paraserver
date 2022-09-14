/*
** Strategy: Double Bottom pattern, depends on AnHLTrend flags 'hl_trend.new.low'
**
**
*/

const Strategy = require("../types/Strategy");


class EntryFinder {

    static MAX_BOTTOMS_LENGTH   = 25;
    static MAX_ENTRY_LENGTH     = 40;
    static REQ_LEVEL            = 40;
    static RR_RATIO             = 1.5;
    static NECK_HEIGHT_MULT     = 0.95;

    static DBG_BOTTOMS          = { radius: 1.7, color: 'black' };
 
    constructor(strategyObject,id,isLong,firstBottom,io) {
        this.id = id;
        this.io = io;
        this.isLong = isLong;
        this.strategyObject = strategyObject;

        this.firstBottom = firstBottom;

        if (this.isLong) {
            this.firstBottomY0 = firstBottom.low;
            this.firstBottomY1 = firstBottom.bodyLow();
        }
        else {
            this.firstBottomY0 = firstBottom.bodyHigh();
            this.firstBottomY1 = firstBottom.high;
        }

        this.secondBottom = null;
        this.greenCount = 0;
        this.redCount = 0;
        this.totalCount = 0;
        
        this.neckCandle = null;

        this.secondCandle = null;
        this.prevCandle = null;
        this.wfcandle = null;   // should be at leas one wfractal

        this.label(firstBottom,'B1');

        console.log('DBL: new finder #'+id+', '+isLong+', '+firstBottom.symbol);

    }

    getId() { return this.id; }

    addCandle(candle, io) {
        
        if (this.candleBreaksZone(candle)) {
            this.label(candle,'xB')
            return false;
        }

        if (this.totalCount == 0) {
            this.secondCandle = candle;
        }

        this.totalCount++;

        if (this.totalCount > 1) {
            const wf = io.get('wfractals');
            if (wf) {
                if (this.isLong) {
                    if (wf.type=='high') { this.wfcandle = wf; }
                } else {
                    if (wf.type=='low') { this.wfcandle = wf; }
                }
            }
        }

        if (! this.secondBottom) {
        
            this.updateNeck(candle);

            if (this.candleAboveZone(candle)) {
                if (candle.isRed())
                    { this.redCount++; } else { this.greenCount++; }
            }
 
            if (this.totalCount > EntryFinder.MAX_BOTTOMS_LENGTH) {
                this.label(candle,'xL')
                return false;
            }

            if (this.readyToSpotSecondBottom() && this.candleTouchesZone(candle)) {
                
                if (! this.wfcandle ) {
                    this.label(candle,'xW');    // was no williams fractal
                    return false;
                }

                if ( [this.firstBottom,this.prevCandle,this.secondCandle,candle]
                    .includes(this.neckCandle)) {
                    this.label(candle,'xNC');  // neckline is too close to secondBottom
                    return false;
                }
                
                this.secondBottom = candle;
                this.label(candle,'B2');
            }

        }

        // we have second bottom and a closure above neckline

        if (this.secondBottom && this.closesAboveNeck(candle) ) {
            
            this.circle(this.firstBottom, EntryFinder.DBG_BOTTOMS);
            this.circle(this.secondBottom, EntryFinder.DBG_BOTTOMS);

            this.label(this.neckCandle,'NCK');

            if ( ! this.makeEntry(candle, io) ) {
                this.label(candle,'NE');
            }

            return false;
        }

        // Limit length search for breaking neck

        if (this.totalCount > EntryFinder.MAX_ENTRY_LENGTH) {
            this.label(candle,'xN')
            return false;
        }

        this.prevCandle = candle;

        return true;

    }


    label(candle,text) {
        text = this.id+'.'+text;
        if (this.isLong) {
            return this.io.cdb().labelBottom(candle,text);
        }
        return this.io.cdb().labelTop(candle,text);
    }

    circle(candle,param) {
        if (this.isLong) {
            return this.io.cdb().circleLow(candle, param);
        }
        return this.io.cdb().circleHigh(candle,param);
    }

    updateNeck(candle)
    {
        if (this.isLong) {
            if ( (!this.neckCandle) || (candle.bodyHigh() > this.neckCandle.bodyHigh())) {
                this.neckCandle = candle;
            }
            return;
        }
        if ( (!this.neckCandle) || (candle.bodyLow() < this.neckCandle.bodyLow())) {
            this.neckCandle = candle;
        }
    }

    closesAboveNeck(candle) {
        if (this.isLong) {
            return candle.close > this.neckCandle.bodyHigh();
        }
        return candle.close < this.neckCandle.bodyLow();
    }

    readyToSpotSecondBottom()
    {
        return (this.greenCount >= 2) && (this.redCount >= 2);
    }

    inZone(y) {
        return (y >= this.firstBottomY0) && (y <= this.firstBottomY1);
    }

    candleAboveZone(candle)  {
        if (this.isLong) {
            return candle.low > this.firstBottomY1;
        }
        return candle.low < this.firstBottomY0;
    }

    candleBreaksZone(candle) {
        if (this.isLong) {
            return candle.low <= this.firstBottomY0;
        }
        return candle.high >= this.firstBottomY1;      
    }

    candleTouchesZone(candle)
    {
        if (this.isLong) {
            return this.inZone(candle.low);
        }
        return this.inZone(candle.high);
    }


    makeEntry(candle, io) {
         
        let levelTouchWeight = 0;

        let touchFirst = this.countTouchWeights(this.firstBottom,io);
        levelTouchWeight += ( this.isLong ? touchFirst.sw : touchFirst.rw );
//        levelTouchWeight += touchFirst.sw + touchFirst.rw;
  
        let touchSecond = this.countTouchWeights(this.secondBottom,io);
        levelTouchWeight += ( this.isLong ? touchSecond.sw : touchSecond.rw );
//        levelTouchWeight += touchSecond.sw + touchSecond.rw;

        /*
        let sameLevel = false;
        touchFirst.ids.forEach( tfId => { 
            if (touchSecond.ids.includes(tfId)) { sameLevel = true; }
        });
        if ( ! sameLevel ) { return false; }
*/
        if (levelTouchWeight < EntryFinder.REQ_LEVEL ) {
            return false;
        }
        
        let ids = [ ... touchFirst.ids, ... touchSecond.ids];

        this.label(candle,'W:'+levelTouchWeight+' ['+ids.join(',')+']');

        /* neck height SL/TP */
/*      
        let figureHeight = 0;
        let entryPrice = candle.close;
        let stopLoss = 0;
        let takeProfit = 0;
        let takeLen = 0;

        if (this.isLong) {
            figureHeight = this.neckCandle.bodyHigh() -
                Math.min(this.firstBottom.bodyLow(),this.secondBottom.bodyLow());
            takeProfit = this.neckCandle.bodyHigh() + 
                figureHeight * EntryFinder.NECK_HEIGHT_MULT;
            takeLen = takeProfit - entryPrice;
            stopLoss = entryPrice - takeLen / EntryFinder.RR_RATIO;
        }
        else {
            figureHeight = 
                Math.max(this.firstBottom.bodyHigh(),this.secondBottom.bodyHigh()) -
                this.neckCandle.bodyLow();
                takeProfit = this.neckCandle.bodyLow() -
                    figureHeight * EntryFinder.NECK_HEIGHT_MULT;
                takeLen = entryPrice - takeProfit;
                stopLoss = entryPrice + takeLen / EntryFinder.RR_RATIO;
        }

        io.makeEntry(this.strategyObject, ( this.isLong ? 'buy' : 'sell' ), {
            rrRatio: EntryFinder.RR_RATIO,
            takeProfit, stopLoss
        });
        
*/
        io.makeEntry(this.strategyObject, ( this.isLong ? 'buy' : 'sell' ), {
            rrRatio: EntryFinder.RR_RATIO,
            usePrevSwing: true
        });


        return true;

    }

    countTouchWeights(candle, io)
    {
        // resist weight, support weight, level ids
        let result = { rw: 0, sw: 0, ids: [] };

        const vlevels = io.get('vlevels');
        if (!vlevels) { return result; } 
            
        let bt = ( this.isLong ? 
                vlevels.getBottomTouchWeights(candle,this.firstBottom.openTime) :
                vlevels.getTopTouchWeights(candle,this.firstBottom.openTime)
        );

        result.rw += bt.rw;
        result.sw += bt.sw;
        result.ids = [ ... result.ids, ... bt.ids];
        
        return result;
    }



}


class DBLBOTTOM extends Strategy {

    constructor() {
        super();
        this.finders = [];
    }

    init(io)
    {
        io.require('hl_trend');
        io.require('vlevels');
        io.require('wfractals');
    }

    getId() { return 'dblbottom'; }

    nextFinderId() {
        //return ++this.fid;
        let max = 0;
        this.finders.forEach( f => { if (f.getId() > max) { max = f.getId(); } });
        return max+1;
    }

    newFinder(isLong,startCandle,io,currentCandle)
    {
        const exists = this.finders.find( f => (f.isLong==isLong)&&(f.firstBottom===startCandle) );
        if (exists) { return null; }

        const sinceCandles = io.getCandlesFrom(startCandle.closeTime);

        const newId = this.nextFinderId();
        const newFinder = new EntryFinder(this,newId,isLong,startCandle,io);

        for (var c of sinceCandles) {
            if (c !== currentCandle) { // currentCandle will be processed in main cycle
                if (! newFinder.addCandle(c,io) ) {
                    return null;
                }
            }
        }

        this.finders.push(newFinder);
    }

  
    addCandle(candle, io) {
        super.addCandle(candle, io);
        io.cdb().setSource(this.getId());  
                
        const newHigh   = io.get('hl_trend.new.high');   
        if (newHigh)
            { this.newFinder(false,newHigh,io,candle); }

        const newLow    = io.get('hl_trend.new.low'); 
        if (newLow)
            { this.newFinder(true,newLow,io,candle); }

        let findersRemove = [];

        for (var finder of this.finders) {
            if ( ! finder.addCandle(candle,io) ) {
                findersRemove.push(finder);
            }
        }

        this.finders = this.finders.filter( f => ! findersRemove.includes(f) );

    }

}

module.exports = DBLBOTTOM;
