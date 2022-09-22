const { fnum } = require('../reports/helper.js');

class Entry {

    static RESULT = Object.freeze({
        ACTIVE: 'active',
        WON: 'won',
        LOST: 'lost'
    })

    static TYPE = Object.freeze({
        BUY: 'buy',
        SELL: 'sell'
    })

    constructor({ time,strategy,symbol,timeframe,isLong,entryPrice,stopLoss,takeProfit,candle })
    {

        this.id = symbol+'-'+timeframe+'-'+strategy+'-'+time;
        this.time = time;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.strategy = strategy;
        this.type = ( isLong ? Entry.TYPE.BUY : Entry.TYPE.SELL );
        
        this.entryPrice = entryPrice;
        this.takeProfit = takeProfit;
        this.stopLoss = stopLoss;
        this.currentPrice = entryPrice;

        this.candle = candle;

        this.active = true;
        this.result = Entry.RESULT.ACTIVE; 
        this.flags = null;
        this.tags = {}

        this.closeTime = null;
        this.closePrice = null;
        
        this.takePriceReached = entryPrice;
        this.takePercentReached = 0;

        this.lossPriceReached = entryPrice;
        this.lossPercentReached = 0;

        this.gainPercent = 0;

        this.comment = ''; 
    }

    isWin() { return this.gainPercent > 0; }
    isClosed() { return ! this.active; }
    isActive() { return this.active; }
    isLong() { return this.type === Entry.TYPE.BUY; }
    isShort() { return this.type === Entry.TYPE.SELL; }

    getTagValue(tagName) { 
        if ( this.tags[tagName] ) {
            return this.tags[tagName].value;
        }
        return null;
    }

    doClose(isWin, time) {
        this.active = false;                
        this.closePrice = this.currentPrice;
        this.closeTime = time;
        this.result = (isWin ? Entry.RESULT.WON : Entry.RESULT.LOST );
    }

    setFlags(flagsSnapshot) { this.flags = flagsSnapshot; };

    setTag(tagName,tagValue) { this.tags[tagName] = { value: tagValue } };
    setTags(tags) { this.tags = tags; }

    setComment(cmt) { this.comment = cmt; }


    updateCurrentPrice(currentPrice)
    {
        if (this.currentPrice === currentPrice) { return; }

        this.currentPrice = currentPrice;

        if (this.isLong()) {

            this.gainPercent = ((this.currentPrice - this.entryPrice) / this.entryPrice)*100;

            if ( this.currentPrice > this.takePriceReached)
                { this.takePriceReached = this.currentPrice; }

            if ( this.currentPrice < this.lossPriceReached)
                { this.lossPriceReached = this.currentPrice; }
        }
        else { // sell

            this.gainPercent = ((this.entryPrice - this.currentPrice) / this.entryPrice)*100;

            if ( this.currentPrice < this.takePriceReached)
                { this.takePriceReached = this.currentPrice; }    

            if ( this.currentPrice > this.lossPriceReached)
                { this.lossPriceReached = this.currentPrice; }
        }
        
        this.takePercentReached = this.calcTakePercentReached();
        this.lossPercentReached = this.calcLossPercentReached();

    }


    calcLossPercentReached() {
        const priceDiff = this.entryPrice - this.lossPriceReached;
        const target = Math.abs(this.stopLoss - this.entryPrice);
        const coef = fnum( Math.abs(priceDiff / target) * 100, 2);
        return ( coef < 100 ? coef : 100 );     
    }

    calcTakePercentReached() {
        const priceDiff = this.takePriceReached - this.entryPrice;
        const target = Math.abs(this.takeProfit - this.entryPrice);
        const coef = fnum( Math.abs(priceDiff / target) * 100, 2);
        return ( coef < 100 ? coef : 100 );     
    }

    /* export/import IO */

    tagsStringify()
    {
        let res = '';
        for (const tag in this.tags) {
            res += ' '+tag+':'+this.tags[tag].value+
                ( this.tags[tag].comment ? ' ['+this.tags[tag].comment+']' : '');
        }
        return res;         
    }

    toGUI() {
        return {
            id: this.id,
            time: this.time,
            type:  this.type,
            symbol: this.symbol,
            timeframe: this.timeframe,
            strategy: this.strategy,
            entryPrice: this.entryPrice,
            takeProfit: this.takeProfit,
            stopLoss: this.stopLoss,
            active: ( this.active ? 'Y' : 'N'),
            result: this.result,
            closeTime: this.closeTime,
            closePrice: this.closePrice,
            gainPercent: this.gainPercent,
            takePriceReached: this.takePriceReached,
            takePercentReached: this.takePercentReached,
            lossPriceReached: this.lossPriceReached,
            lossPercentReached: this.lossPercentReached,
            comment:  this.comment + this.tagsStringify(),
            flags: {},
            tags: {},
        }
    }



    toSTORE() {
        return {
            id: this.id,
            time: this.time,
            type:  this.type,
            symbol: this.symbol,
            timeframe: this.timeframe,
            strategy: this.strategy,
            entryPrice: this.entryPrice,
            takeProfit: this.takeProfit,
            stopLoss: this.stopLoss,
            active: ( this.active ? 'Y' : 'N'),
            result: this.result,
            closeTime: this.closeTime,
            closePrice: this.closePrice,
            gainPercent: this.gainPercent,
            takePriceReached: this.takePriceReached,
            takePercentReached: this.takePercentReached,
            lossPriceReached: this.lossPriceReached,
            lossPercentReached: this.lossPercentReached,
            comment:  this.comment,
            flags: JSON.stringify(this.flags),
            tags: JSON.stringify(this.tags),
        }
    }

    static fromSTORE(data)
    {
        let entry = new Entry({
                time: data.time,
                strategy: data.strategy,
                symbol: data.symbol,
                timeframe: data.timeframe,
                isLong: (data.type === Entry.TYPE.BUY),
                entryPrice: data.entryPrice,
                stopLoss: data.stopLoss,
                takeProfit: data.takeProfit                 
        });
         
        entry.active = ( data.active == 'Y');
        entry.broker = ( data.broker == 'Y');
        entry.result = data.result;
        entry.closePrice = data.closePrice;
        entry.gainPercent = data.gainPercent;
        entry.takePriceReached = data.takePriceReached;
        entry.takePercentReached = data.takePercentReached;
        entry.lossPriceReached = data.lossPriceReached;
        entry.lossPercentReached = data.lossPercentReached;

        entry.comment =  data.comment;
        entry.flags = JSON.parse(data.flags);
        entry.tags = JSON.parse(data.tags);
   
        return entry;
    }
    
}

module.exports = Entry;
