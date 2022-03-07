/*
** Strategy helper toolbox - hidden in analyzers to benefit runtime reload
** 
** Can check (filter) common ENTRY conditions
** Can create common STOPLOSS / TAKE configuration entries
**
*/

const AnalyzerIO = require("../AnalyzerIO");
const CDB = require('../../types/CandleDebug');


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
    makeEntry(strategyId, {
            entryPrice, stopLoss, takeProfit, lowLevel, 
            rrRatio, stopAtrRatio, 
            noMagic, noFilterMAC, noFilterTrend, noTargetLevel, noRSI50
        } ) 
    {
      
        if (noMagic) {
            noFilterMAC = true;
            noFilterTrend = true;
            noTargetLevel = true;
            noRSI50 = true;
        }

        let cmt = '';

        const atr14 = this.flags.get('atr14');
        if (! atr14 ) { return console.log('HELPER: no entry atr14 not ready.'); }

        const mac20 = this.flags.get('mac20');
        const mac50 = this.flags.get('mac50');
        const mac100 = this.flags.get('mac100');

        if (! mac20 || ! mac50 || ! mac100 ) {
            console.log('HELPER: mac20/50/100 no ready.');
            return false;
        }

        
        const rsi = this.flags.get('rsi14');

        if (rsi) {
            const rsi_tf = rsi.toFixed(2);
            if (rsi < 50) {
                cmt += ( rsi < 30 ? ' RSI<30' : ' RSI<50');
                if (! noRSI50 ) {
                    return false;
                }
            }
            else {
                cmt += ( rsi > 70 ? ' RSI>70' : ' RSI>50');
            }
            cmt += '('+rsi_tf+')';
        }

        if ( mac20.value < mac50.value ) { cmt += ' MC[20<50]'; }
        if ( mac50.value < mac100.value) { 
                cmt += ' MC[50<100]'; 
                if (!noFilterMAC) { return false; }
        }

        const higherTrend = this.flags.getHTF('hl_trend');
        if ( higherTrend ) {
            cmt += ' TH['+higherTrend.direction+'/'+higherTrend.swings+']';
            if (!noFilterTrend && (higherTrend.direction < 0)) {
                return false;
            }
        }

        const trend = this.flags.get('hl_trend');
        if ( trend ) {
            cmt += ' T['+trend.direction+'/'+trend.swings+']';
            if (!noFilterTrend && (trend.direction < 0)) {
                return false;
            }
        }
        
        if (! rrRatio) { rrRatio = StrategyHelper.DEF_RR_RATIO; }
        if (! stopAtrRatio) { stopAtrRatio = StrategyHelper.STOP_ATR_RATIO; }
        if (! lowLevel ) { lowLevel = this.candle.low; };
        if (! entryPrice) { entryPrice = this.candle.close; }

        if (! stopLoss ) { stopLoss = lowLevel - atr14 * stopAtrRatio; } 
        const stopHeight = entryPrice - stopLoss;
        if (! takeProfit) { takeProfit = entryPrice + stopHeight * rrRatio; }


        if (! noTargetLevel ) {

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
        
        CDB.labelTop(this.candle,'EN');
        CDB.circleMiddle(this.candle,{ color: 'blue', radius: 5, alpha: 0.1 });
        CDB.entry(this.candle,takeProfit,stopLoss);

        return this.ordersManager.newOrderBuy(
            this.flags, 
            strategyId, 
            entryPrice, 
            takeProfit, 
            stopLoss,
            this.candle.symbol,
            this.candle.timeframe,
            this.candle.closeTime,
            cmt
        );

    }

    getOpenOrder(timeframe,strategy) {
        return this.ordersManager.getOpenOrder(timeframe,strategy);
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
