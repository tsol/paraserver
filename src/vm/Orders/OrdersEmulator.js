const CDB = require('../../types/CandleDebug');

const OrderTaggers = require('./taggers/OrderTaggers.js');
const { TF } = require('../../types/Timeframes.js');
const TH = require('../../helpers/time');

const Entry = require('../../types/Entry.js');

const SETTINGS = require('../../../private/private.js');
const { winRatio, fnum } = require('../../reports/helper.js');

class OrdersEmulator {

/*
    static SHTDN_MAX_RISK_USD = -40;
    static SHTDN_REQ_SAME_TYPE = 66.6;
    static SHTDN_REQ_BELOW_TAKE_REACHED = 5;
    static SHTDN_REQ_BELOW_LOSS_REACHED = 60;

    static RISK_REAL_USD = 250;

    static TRAILING_STOP_TRIGGER = 50; 
    static TRAILING_LOSSLESS = (this.params.COST_BUY_PERCENT+this.params.COST_SELL_PERCENT) * 2;
*/

    constructor(brokerCandles) {        

        this.params = {};

        // todo: params from private.js, later from users prefs in db

        this.params.STAKE_USD = 100; /* stake using leverage */
        this.params.LEVERAGE = 20;
        this.params.MARGINCALL_GAIN = -1*(this.params.STAKE_USD / this.params.LEVERAGE);
        this.params.COST_BUY_PERCENT = 0.0004;  // 4 cents from every 100 dollars
        this.params.COST_SELL_PERCENT = 0.0004; // 0.04 % taker comission
    
        this.brokerCandles = brokerCandles;

        this.entries = [];
        this.activeEntries = [];
        this.limitEntries = [];

        this.taggers = new OrderTaggers(this.params);
   
        this.lastUpdateTime = null;
    }

    reset() {
        this.entries = [];
        this.taggers.reset();
    }
    
    // entriesManager (candleProcessor) IO:

    priceUpdate (symbol,eventTime,lowPrice,highPrice,currentPrice)
    {
        this.lastUpdateTime = eventTime;

        const entries = this.activeEntries.filter( o => (o.symbol === symbol) );
        let long  = entries.filter( o => o.isLong() );
        let short = entries.filter( o => o.isShort() );
        
        // 1. MARGIN CALLS + STOP LOSSES first

        short.forEach( (o) => {            
            if ( highPrice >= o.stopLoss ) {
                o.updateCurrentPrice(o.stopLoss);
                this.closeEntry(o, false);
            } 
        });

        long.forEach( (o) => {
            if (lowPrice <= o.stopLoss) {
                o.updateCurrentPrice(o.stopLoss);
                this.closeEntry(o, false);
            } 
        });

        short = short.filter( o => o.isActive() );
        long = long.filter( o => o.isActive() );

        // 2. take profits

        short.forEach( (o) => {
            if (lowPrice <= o.takeProfit) {
                o.updateCurrentPrice(o.takeProfit);
                this.closeEntry(o, true);
            } 
        });

        long.forEach( (o) => {
            if (highPrice >= o.takeProfit) {
                o.updateCurrentPrice(o.takeProfit);
                this.closeEntry(o, true);
            } 
        });


        this.limitEntriesPriceUpdate(symbol,eventTime,lowPrice,highPrice,currentPrice);

        return;

    }


    limitEntriesPriceUpdate (symbol,eventTime,lowPrice,highPrice,currentPrice)
    {
        let entries = this.limitEntries.filter( o => (o.symbol === symbol) );

        entries.forEach( (o) => {
            if (o.isLong) {
                if (highPrice >= o.entryPrice) {
                    console.log('OEMU: limit BUY entry TRIGGERED '+o.symbol+'-'+o.timeframe
                    +' '+TH.ls(eventTime)+' ('+eventTime+')');
                    this.killLimitEntry(o);
                    this.marketEntry(o);
                }
            }
            else {
                if (lowPrice <= o.entryPrice) {
                    console.log('OEMU: limit SELL entry TRIGGERED '+o.symbol+'-'+o.timeframe
                    +' '+TH.ls(eventTime)+' ('+eventTime+')');

                    this.killLimitEntry(o);
                    this.marketEntry(o);
                }                
            } 
        });

        entries = this.limitEntries.filter( o => (o.symbol === symbol) );

        entries.forEach( o => {
            if (eventTime >= o.expire) {
                this.killLimitEntry(o);
                console.log('OEMU: limit entry timeout '+o.symbol+'-'+o.timeframe
                +' '+TH.ls(eventTime)+' ('+eventTime+')');
            }
        });

    }


    limitEntry( params ) {
        console.log('OEMU: new limit entry: '+params.symbol+'-'+params.timeframe+' '
        + TH.ls(params.time) +'('+params.time+') -> '+TH.ls(params.expire)+' ('+params.expire+')');
        this.limitEntries.push(params);
    }

    killLimitEntry(entry) {
        this.limitEntries = this.limitEntries.filter( o => o !== entry );
    }

    marketEntry({
        time,
        strategy,
        symbol,
        timeframe,
        isLong,
        entryPrice, 
        takeProfit, 
        stopLoss,
        comment,
        flags,
        candle
    }) {

        /*
        
        // TODO: move to tagger (dynamic tagger)

        const totalRisk = this.calcActiveEntriesMaxLoss(); 

        console.log('OEMU: new entry '+symbol+'/'+strategy+' total_risk='+totalRisk+
            ' entries='+this.activeEntries.length);

        if (Math.abs(totalRisk) > this.params.RISK_REAL_USD ) {
            //console.log('OEMU: ABOVE RISK ')
            return null;
        }
        */

        let flagsSnapshot = null;

        if (! SETTINGS.noFlagsSnapshot) {
            flagsSnapshot = JSON.parse(JSON.stringify(flags.getAll()));
        }

/*
        let quantity = 0;
        let aligned = null;
        try {        
            aligned = this.brokerCandles.getAlignedEntryDetails(symbol,entryPrice,
                this.params.STAKE_USD,stopLoss,takeProfit);
            stopLoss = aligned.stopLoss;
            takeProfit = aligned.takeProfit;
            quantity = aligned.quantity;

        } catch (e) {
            console.log("BAD ORDER PARAMS: "+e.message);
            return null;
        }
*/

        const entry = new Entry({
            time: time,
            strategy: strategy,
            symbol: symbol,
            timeframe: timeframe,
            isLong: isLong,
            entryPrice: entryPrice,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            candle: candle
        });

        entry.setFlags(flagsSnapshot);
        entry.setTags( this.taggers.getTags(entry, flags, this.entries, entry.tags) );
        entry.setComment(comment);

        /* filter */
    
        CDB.setSource(strategy);
        CDB.labelTop(candle,'EN');
        CDB.circleMiddle(candle,{ color: 'blue', radius: 5, alpha: 0.1 });
        CDB.entry(candle,entryPrice,takeProfit,stopLoss);

        this.entries.push(entry);
        this.activeEntries.push(entry);
        return entry;

    }
/*
    calcActiveEntriesMaxLoss()
    {
        const ml = this.activeEntries.reduce( (sum, o) => sum+o.getTagValue('MAXLSS'), 0 );
        return ml;
    }
*/

    getEntries() {
        return this.entries;
    }

    scheduleMinutely() {
/*        return;

    static SHTDN_MAX_RISK_USD = -40;
    static SHTDN_REQ_SAME_TYPE = 66.6;
    static SHTDN_REQ_BELOW_TAKE_REACHED = 5;
    static SHTDN_REQ_BELOW_LOSS_REACHED = 60;

        if (this.activeEntries.length < 30) { return; }
        
        let byTime = {};

        let entries = this.activeEntries.filter( o => {
            return (o.lossPercentReached > o.takePercentReached);
        });

        for ( var o of entries ) {
            if (! byTime[ o.time ]) { byTime[ o.time ] = []; }
            byTime[ o.time ].push(o);
        }

        for ( var tm in byTime ) {
            let arr = byTime[tm];
            if (! arr || arr.length <= 20 ) { continue; }
    
            let cnt = arr.length;
            let gain = arr.reduce( (sum, entry) => sum + entry.gain, 0 );
    
            console.log('OEMU: many_entries '+TH.ls(this.lastUpdateTime)
                +' start='+tm+' cnt='+cnt+' gain='+gain);
            
            if ( (gain / cnt > 3.5) || (gain / cnt < -2.5) ) {
                this.closeAll(arr);
            }

        }
*/
    }


    closeAll(entriesArray) {
        let entries = (entriesArray || this.activeEntries);
        console.log('OEMU: closing all');
        console.log(entries);
        entries.forEach( o => this.closeEntry(o, o.gainPercent > 0) && o.setTag('SHTDN','Y') );
    }
 
    closeEntry(entry,isWin) {
        entry.doClose(isWin,this.lastUpdateTime);
        this.activeEntries = this.activeEntries.filter( o => o !== entry );
    }

    toGUI() {
        return this.entries.map( (v) => {
            return v.toGUI();
        });
    }

    getEntryById(entryId) {
        if (! this.entries || this.entries.length === 0) { return null; }
        return this.entries.find( v => v.id == entryId );
    }

    getOpenEntry(symbol, timeframe, strategy)
    {
        if (! this.activeEntries || this.activeEntries.length === 0) { return false; }

        const found = this.activeEntries.find( 
            (v) => {
                return     (v.symbol == symbol)
                        && (v.timeframe == timeframe) 
                        && (v.strategy == strategy); 
            }
        );

        return found;
    }

    // todo: move to separate reports module
/*
    genStatistics(fromTimestamp, toTimestamp) {

        if (! this.entries || this.entries.length === 0) { return []; }

        if (! fromTimestamp ) {
            fromTimestamp = 0;
        }

        if (! toTimestamp ) {
            toTimestamp = TH.currentTimestamp()+60000;
        }

        let uniqSS = {};  // unique SYMBOL-STRATEGY hash
        let accSST = {};  // SYMBOL-STRATEGY-TIMEFRAME accumulator

        for (let entry of this.entries) {

            if (entry.active
                || (entry.time < fromTimestamp)
                || (entry.time > toTimestamp )
            ) { continue; }

            let idSS = entry.symbol+'-'+entry.strategy;
            let idSST = idSS+'-'+entry.timeframe;

            if (! uniqSS[ idSS ]) {
                uniqSS[ idSS ] = { 
                    symbol: entry.symbol,
                    strategy: entry.strategy,
                    win: 0, lost: 0, gain: 0
                };
            }

            if (! accSST[ idSST ]) {
                accSST[ idSST ] = {
                    symbol: entry.symbol,
                    strategy: entry.strategy,
                    timeframe: entry.timeframe,
                    win: 0, lost: 0, gain: 0
                };
            }

            if (entry.gain > 0) {
                accSST[ idSST ].win++;
                uniqSS[ idSS ].win++;
            }
            else {
                accSST[ idSST ].lost++;
                uniqSS[ idSS ].lost++;
            }

            accSST[ idSST ].gain += entry.gain;
            uniqSS[ idSS ].gain += entry.gain;

        }

        let res = [];

        Object.keys(uniqSS).forEach( (idSS) => {
            
            const u = uniqSS[ idSS ];

            let reportLine = {
                symbol: u.symbol,
                strategy: u.strategy,
                entries: (u.win+u.lost),
                ratio: winRatio(u.win,u.lost),
                gain: fnum(u.gain,2)
            };

            TF.TFRAMES.forEach( (t) => {
                const timeframe = t.name;

                const idSST = u.symbol+'-'+u.strategy+'-'+timeframe;
                if (! accSST[ idSST ]) {
                    reportLine[timeframe+'_entries'] = 0;
                    reportLine[timeframe+'_ratio'] = 0;
                    reportLine[timeframe+'_gain'] = 0;
                }
                else {
                    let a = accSST[ idSST ];
                    reportLine[timeframe+'_entries'] = a.win + a.lost;
                    reportLine[timeframe+'_ratio'] = winRatio(a.win, a.lost);
                    reportLine[timeframe+'_gain'] = fnum(a.gain,2);
                }

            });

            res.push(reportLine);

        });

        return res;
    }
*/
 
    /* helpers */

    recalcEntryGain(entry,currentPrice)
    {
        entry.setPrice(currentPrice);
        entry.recalcGainPercent();
    }
/*
    isMarginCallReached(entry) {
        if (entry.gain <= this.params.MARGINCALL_GAIN) {
            entry.setGain(this.params.MARGINCALL_GAIN);
            entry.setTag('MC','Y');
            return true;
        }
        return false;
    }
*/
}

module.exports = OrdersEmulator;
