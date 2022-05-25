const CDB = require('../../types/CandleDebug');

class AnalyzersIO {

    static ENTRY_DEF_RR_RATIO                 = 1.35;
    static ENTRY_STOP_ATR_RATIO               = 1;
    static ENTRY_TARGET_LEVEL_REQ_WEIGHT      = 40;
    static ENTRY_TARGET_LEVEL_SEARCH_RATIO    = 1.8;
    static ENTRY_SWSL_FIND_MAX_CANDLES        = 25;

    constructor(box, ordersManager) {
        this.box = box;
        this.ordersManager = ordersManager;

        this.candle = null;
        this.flags = null;

    }

    init() {
        this.require('atr14');
        this.require('prev_swing');
    }

    require(analyzerName) {
        return this.box.addAnalyzer(analyzerName);
    }

    get(flagName) {
        return this.flags.get(flagName);
    }

    set(flagName, value) {
        this.flags.set(flagName,value);
    }

    getSymbolInfo(symbol) {
        return this.ordersManager.getSymbolInfo(symbol);
    }

    // enters at current candles close
    makeEntry(strategyObject, type, {
            entryPrice, stopLoss, takeProfit,
            stopFrom, rrRatio, stopATRRatio,
            useTargetLevel, usePrevSwing
        } ) 
    {
        
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

        if (! rrRatio) { rrRatio = AnalyzersIO.ENTRY_DEF_RR_RATIO; }
        if (! stopATRRatio) { stopATRRatio = AnalyzersIO.ENTRY_STOP_ATR_RATIO; }
        
        if (! entryPrice) { entryPrice = this.candle.close; }
        
        if (! stopFrom ) { stopFrom = entryPrice };
    
        if (! stopLoss ) { stopLoss = stopFrom - direction * atr14 * stopATRRatio; } 
        const stopHeight = Math.abs(entryPrice - stopLoss);

        if (! takeProfit) { takeProfit = entryPrice + direction * stopHeight * rrRatio; }

        if (usePrevSwing) {
            const psw = this.calcPrevSwingSL(type,stopFrom,rrRatio);
            if (! psw) { return false; }
            takeProfit = psw.takeProfit;
            stopLoss = psw.stopLoss;
        }

 
        CDB.labelTop(this.candle,'EN');
        CDB.circleMiddle(this.candle,{ color: 'blue', radius: 5, alpha: 0.1 });
        CDB.entry(this.candle,takeProfit,stopLoss);

        return this.ordersManager.newOrder(
            this.candle.closeTime,
            strategyObject.getId(),
            this.candle.symbol,
            this.candle.timeframe,
            isBuy,
            entryPrice, 
            takeProfit, 
            stopLoss,
            cmt,
            this.flags 
        );

    }

    getOpenOrder(symbol,timeframe,strategy) {
        return this.ordersManager.emulator.getOpenOrder(symbol,timeframe,strategy);
    }

    /* parent box interface */

    setCurrentCandleAndFlags(candle, flags) {
        this.candle = candle;
        this.flags = flags;
    }

    /* helpers */

    // returns { stopLoss, takeProfit }
    calcPrevSwingSL(orderType,entryPrice,ratio)
    {
        const isLong = (orderType == 'buy');
        const sw = this.flags.get('prev_swing');
        if (! sw) { return null; }
  
        const swCandleHigh = sw.findHigh(AnalyzersIO.ENTRY_SWSL_FIND_MAX_CANDLES,entryPrice);
        const swCandleLow = sw.findLow(AnalyzersIO.ENTRY_SWSL_FIND_MAX_CANDLES,entryPrice);

        if (isLong) { 
            if (! sw.getHigh()) { return null; } 
            takeProfit = sw.getHigh().high;
            if (takeProfit <= entryPrice) { return null; }
        }
        else {
            if (! sw.getLow()) { return null; } 
            takeProfit = sw.getLow().low;
            if (takeProfit >= entryPrice) { return null; }
        }

        const stopDir = ( isLong ? -1 : 1 );
        const takeHeight = Math.abs(takeProfit - entryPrice);
        const stopLoss = entryPrice + stopDir * takeHeight / ratio;

        return { takeProfit, stopLoss };

    }


}

module.exports = AnalyzersIO;