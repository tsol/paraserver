/*
** Strategy: Double Bottom pattern, depends on AnHLTrend flags 'hl_trend.new.low' or 'hills.new.low'
**
**
*/

const TH = require("../../../helpers/time");
const Strategy = require("../types/Strategy");


class EntryFinder {

    static FIRST_BOTTOM_TRIGGER = 'hills'; // or 'hl_trend'

    //static SECOND_BOTTOM_PERCENT = 0.1;

    static MAX_BOTTOMS_LENGTH   = 100;
    static MAX_ENTRY_LENGTH     = 200;

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
            this.zoneY0 = firstBottom.low;
            this.zoneY1 = firstBottom.bodyLow();
        }
        else {
            this.zoneY0 = firstBottom.bodyHigh();
            this.zoneY1 = firstBottom.high;
        }
   
        this.secondBottom = null;
        this.greenCount = 0;
        this.redCount = 0;
        this.totalCount = 0;
        this.levelTouchWeight = 0;
        
        this.neckCandle = null;

        this.secondCandle = null;
        this.prevCandle = null;
        this.wfcandle = null;   // should be at leas one wfractal
        this.candleAfterB2 = null;

        this.label(firstBottom,'B1');

        console.log('DBL: new finder #'+id+', '+isLong+', '+
            firstBottom.symbol+' '+TH.ls(firstBottom.openTime));

    }

    getId() { return this.id; }

    addCandle(candle, io, candleIsCurrent) {
        
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
                
                if ( this.wfcandle ) { // if there was an extremum (true neck)

                    if ( [this.firstBottom,this.prevCandle,this.secondCandle,candle]
                        .includes(this.neckCandle)) {
                        this.label(candle,'xNC');  // neckline is too close to secondBottom
                        return false;
                    }
                
                    this.secondBottom = candle;
                    this.label(candle,'B2');

                    let nok = this.bottomsNotOkReason(io);
                    if (nok) {
                        this.label(candle,nok);
                        return false;
                    }

                }
            }

        } else {
            // secondBottom allready was initialized by previous candle
            if (this.candleAfterB2 === null) {
                this.candleAfterB2 = candle;

                if ( this.canEnterAfterB2(candle) ) {
                    if ( candleIsCurrent ) {
                        this.makeEntryAfterB2(candle, io);
                        return false;
                    }
                }
            }
        }


        // we have second bottom and a closure above neckline

        if (this.secondBottom && this.closesAboveNeck(candle) ) {
            if ( ! candleIsCurrent ) {
                this.label(candle,'xS'); // stale entry.
                return false;
            }
            this.makeEntryAboveNeckline(candle,io);
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
        return (y >= this.zoneY0) && (y <= this.zoneY1);
    }

    candleAboveZone(candle)  {
        if (this.isLong) {
            return candle.low > this.zoneY1;
        }
        return candle.low < this.zoneY0;
    }

    candleBreaksZone(candle) {
        if (this.isLong) {
            return candle.low <= this.zoneY0;
        }
        return candle.high >= this.zoneY1;      
    }

    candleTouchesZone(candle)
    {
        if (this.isLong) {
            return this.inZone(candle.low);
        }
        return this.inZone(candle.high);
    }

    markUpEntry(entryCandle,label) {
        this.circle(this.firstBottom, EntryFinder.DBG_BOTTOMS);
        this.circle(this.secondBottom, EntryFinder.DBG_BOTTOMS);
        this.label(this.neckCandle,'NCK');
        this.label(entryCandle,label+':'+this.levelTouchWeight);
    }

    bottomsNotOkReason(io) {
        let levelTouchWeight = 0;

        let touchFirst = this.countTouchWeights(this.firstBottom,io);
        levelTouchWeight += ( this.isLong ? touchFirst.sw : touchFirst.rw );
  
        let touchSecond = this.countTouchWeights(this.secondBottom,io);
        levelTouchWeight += ( this.isLong ? touchSecond.sw : touchSecond.rw );

        if (levelTouchWeight < EntryFinder.REQ_LEVEL ) {
            return 'xQL';
        }

        let sameLevel = false;
        touchFirst.ids.forEach( tfId => { 
            if (touchSecond.ids.includes(tfId)) { sameLevel = true; }
        });
        if ( ! sameLevel ) {
            return 'xSL';
        }

        this.levelTouchWeight = levelTouchWeight;

        return null;
    }

    canEnterAfterB2(candleAfterB2) {
        if (! this.candleAboveZone(candleAfterB2) ) { return false; }
        const colorOk = (this.isLong && candleAfterB2.isGreen()) ||
                        (!this.isLong && candleAfterB2.isRed());
        if (! colorOk) { return false; }

        let ds, dh = 0;

        if (this.isLong) {
            ds = candleAfterB2.bodyHigh() - this.secondBottom.low;
            dh = this.neckCandle.high - this.secondBottom.low;
        }
        else {
            ds = this.secondBottom.high - candleAfterB2.bodyLow();
            dh = this.secondBottom.high - this.neckCandle.low;
        }

        return ( dh - 3*ds > 0 );

    }

    makeEntryAfterB2(candle, io) {
        
        this.markUpEntry(candle,'EB');
           
        let entryPrice = candle.close;
        let stopLoss = 0;
        let takeProfit = 0;
        let takeLen = 0;

        if (this.isLong) {
            takeProfit = this.neckCandle.bodyHigh();
            takeLen = takeProfit - entryPrice;
            stopLoss = entryPrice - takeLen / EntryFinder.RR_RATIO;
        }
        else {
            takeProfit = this.neckCandle.bodyLow();
            takeLen = entryPrice - takeProfit;
            stopLoss = entryPrice + takeLen / EntryFinder.RR_RATIO;
        }

        io.makeEntry(this.strategyObject, ( this.isLong ? 'buy' : 'sell' ), {
            rrRatio: EntryFinder.RR_RATIO,
            takeProfit, stopLoss
        });
        
        return true;

    }


    makeEntryAboveNeckline(candle, io) {
        
        this.markUpEntry(candle,'EN');

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
        this.maxId = 0;
    }

    init(io)
    {
        io.require(EntryFinder.FIRST_BOTTOM_TRIGGER);
        io.require('vlevels');
        io.require('wfractals');
    }

    getId() { return 'dblbottom'; }

    nextFinderId() {
        this.maxId++;
        if (this.maxId > 99) {
            this.maxId = 1;
        }
        return this.maxId;
        //let max = 0;
        //this.finders.forEach( f => { if (f.getId() > max) { max = f.getId(); } });
        //return max+1;
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
                if (! newFinder.addCandle(c,io,false) ) {
                    return null;
                }
            }
        }

        this.finders.push(newFinder);
    }

  
    addCandle(candle, io) {
        super.addCandle(candle, io);
        io.cdb().setSource(this.getId());  
                
        const newHigh   = io.get(EntryFinder.FIRST_BOTTOM_TRIGGER+'.new.high');   
        if (newHigh)
            { this.newFinder(false,newHigh,io,candle); }

        const newLow    = io.get(EntryFinder.FIRST_BOTTOM_TRIGGER+'.new.low'); 
        if (newLow)
            { this.newFinder(true,newLow,io,candle); }

        let findersRemove = [];

        for (var finder of this.finders) {
            if ( ! finder.addCandle(candle,io,true) ) {
                findersRemove.push(finder);
            }
        }

        this.finders = this.finders.filter( f => ! findersRemove.includes(f) );

    }

}

module.exports = DBLBOTTOM;
