/*
** Strategy helper toolbox - wrapped as analyzer to benefit runtime reload
** 
** Can check (filter) common ENTRY conditions
** Can create common STOPLOSS / TAKE configuration entries
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');
const { TF } = require('../../types/Timeframes.js');

class StrategyHelper {

    static DEF_RR_RATIO     = 1.35;
    static STOP_ATR_RATIO   = 1;

    static TARGET_LEVEL_REQ_WEIGHT      = 40;
    static TARGET_LEVEL_SEARCH_RATIO    = 1.8;

    constructor(ordersManager) {
        this.ordersManager = ordersManager;
        this.candle = null;
        this.flags = null;
    }

    setCurrentCandleAndFlags(candle, flags) {
        this.candle = candle;
        this.flags = flags;
    }

    toJSON() { return null; }

    // enters at current candles close
    makeEntry(strategyObject, type, {
            entryPrice, stopLoss, takeProfit,
            stopFrom, rrRatio, stopATRRatio,
            useTargetLevel
        } ) 
    {
        if (!TF.get(this.candle.timeframe).trade) { return; }
        
        if (this.getOpenOrder(
            this.candle.symbol, this.candle.timeframe, strategyObject.getId()
            )) {
            //console.log('HELPER: order already open');
            return false;
        }

        const isBuy = ( type === 'buy' );
        const direction = ( isBuy ? 1 : -1 );

        const atr14 = this.flags.get('atr14');
        if (! atr14 ) { return console.log('HELPER: atr14 not ready.'); }

        let cmt = '';

        /*
        const rsi = this.flags.get('rsi14');
        
        if (rsi) {
            if (rsi < 50)
                { cmt += ( rsi < 30 ? ' RSI<30' : ' RSI<50'); }
            else
                { cmt += ( rsi > 70 ? ' RSI>70' : ' RSI>50'); }
            cmt += ' ('+rsi.toFixed(2)+')';
        }

        const higherTrend = this.flags.getHTF('hl_trend');
        if ( higherTrend ) {
            if (higherTrend.direction < 0)
                { cmt += ' TH_DN'; }
            else if (higherTrend.direction > 0)
                { cmt += ' TH_UP'; }
            else  { cmt += ' TH_NO'; }
            cmt += ' TH['+higherTrend.direction+'/'+higherTrend.swings+']';
        }

        const trend = this.flags.get('hl_trend');
        if ( trend ) {
            if ( trend.direction < 0 )
            { cmt += ' T_DN'; }
            else if ( trend.direction > 0 )
            { cmt += ' T_UP'; }
            else { cmt += ' T_NO'; }
            cmt += ' T['+trend.direction+'/'+trend.swings+']';
        }
        */

        if (! rrRatio) { rrRatio = StrategyHelper.DEF_RR_RATIO; }
        if (! stopATRRatio) { stopATRRatio = StrategyHelper.STOP_ATR_RATIO; }
        if (! stopFrom ) { stopFrom = (isBuy ? this.candle.low : this.candle.high ); };
        if (! entryPrice) { entryPrice = this.candle.close; }

        if (! stopLoss ) { stopLoss = stopFrom - direction * atr14 * stopATRRatio; } 
        const stopHeight = Math.abs(entryPrice - stopLoss);

        if (! takeProfit) { takeProfit = entryPrice + direction * stopHeight * rrRatio; }

        /*
        if ( useTargetLevel ) {

            const hlevels = this.flags.get('vlevels_high');
            if (hlevels) {
                const targetSearchHigh = entryPrice + stopHeight * StrategyHelper.TARGET_LEVEL_SEARCH_RATIO;

                let foundLevelPrice = hlevels.findUpperTarget({
                    startPrice: takeProfit,
                    maxPrice: targetSearchHigh,
                    reqWTotal: StrategyHelper.TARGET_LEVEL_REQ_WEIGHT
                });

                if (foundLevelPrice > 0) {
                    takeProfit = foundLevelPrice;
                    cmt = cmt + ' TLVL';
                }
            }
        }
        */

        CDB.labelTop(this.candle,'EN');
        CDB.circleMiddle(this.candle,{ color: 'blue', radius: 5, alpha: 0.1 });
        CDB.entry(this.candle,takeProfit,stopLoss);

        return this.ordersManager.newOrder(
            type,
            this.flags, 
            strategyObject, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            this.candle.symbol,
            this.candle.timeframe,
            this.candle.closeTime,
            cmt
        );

    }

    getOpenOrder(symbol,timeframe,strategy) {
        return this.ordersManager.emulator.getOpenOrder(symbol,timeframe,strategy);
    }


}

class AnStrategyHelper extends AnalyzerIO {
        constructor(ordersManager) {
            super();
            this.helper = new StrategyHelper(ordersManager);
        }
        getId() { return 'helper'; }
        addCandle(candle,flags) {
            this.helper.setCurrentCandleAndFlags(candle, flags);
            flags.set('helper', this.helper)
        }

}

module.exports = AnStrategyHelper;
