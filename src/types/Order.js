const { TF } = require('./Timeframes');
const { fnum } = require('../reports/helper.js');

class Order {

    static RESULT = Object.freeze({
        ACTIVE: 'active',
        WON: 'won',
        LOST: 'lost'
    })

    static TYPE = Object.freeze({
        BUY: 'buy',
        SELL: 'sell'
    })

    constructor({ time,strategy,symbol,timeframe,isLong,entryPrice,quantity,stopLoss,takeProfit,candle })
    {

        this.id = symbol+'-'+timeframe+'-'+strategy+'-'+time;
        this.time = time;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.strategy = strategy;
        this.type = ( isLong ? Order.TYPE.BUY : Order.TYPE.SELL );
        
        this.quantity = quantity;
        this.entryPrice = entryPrice;
        this.takeProfit = takeProfit;
        this.stopLoss = stopLoss;
        this.currentPrice = entryPrice;

        this.candle = candle;

        //this.trailingEntryPrice = entryPrice;
        //this.origStopLoss = stopLoss;
        //this.origTakeProfit = takeProfit;

        this.active = true;
        this.broker = false;
        this.db = false;
        this.result = Order.RESULT.ACTIVE; 
        this.flags = null;
        this.tags = {}

        this.closeTime = null;
        this.closePrice = null;
        this.gain = 0;
        
        this.takePriceReached = entryPrice;
        this.takePercentReached = 0;

        this.lossPriceReached = entryPrice;
        this.lossPercentReached = 0;

        this.comment = ''; 
     
        this.brokerORID = null;
        this.brokerSLID = null;
        this.brokerTPID = null;

    }

    isBroker() { return this.broker; }
    isWin() { return this.gain > 0; }
    isClosed() { return ! this.active; }
    isActive() { return this.active; }
    isLong() { return this.type === Order.TYPE.BUY; }
    isShort() { return this.type === Order.TYPE.SELL; }
    isDb() { return this.db; }

    getTagValue(tagName) { 
        if ( this.tags[tagName] ) {
            return this.tags[tagName].value;
        }
        return null;
    }

    gettakePercentReached() { return this.takePercentReached; }

    doClose(isWin, time) {
        this.active = false;                
        this.closePrice = this.currentPrice;
        this.closeTime = time;
        this.result = (isWin ? Order.RESULT.WON : Order.RESULT.LOST );
    }

    setStopLoss(newStopLoss) { this.stopLoss = newStopLoss; }

    setDb() { this.db = true; }
    setBrokerTrue() { this.broker = true; }

    setFlags(flagsSnapshot) { this.flags = flagsSnapshot; };
    setTag(tagName,tagValue) { this.tags[tagName] = { value: tagValue } };
    setTags(tags) { this.tags = tags; }

    setPrice(currentPrice) { this.currentPrice = currentPrice; }
    setGain(g) { this.gain = g; }

    setComment(cmt) { this.comment = cmt; }
    setQuantity(q) { this.quantity = q; }
    setBrokerORID (id) { this.brokerORID = id; }
    setBrokerSLID (id) { this.brokerSLID = id; }
    setBrokerTPID (id) { this.brokerTPID = id; }




    recalcGain(comissionPercentBuy, comissionPercentSell)
    {
        const boughtInUSD = this.quantity * this.entryPrice;
        const soldInUSD = this.quantity * this.currentPrice;
        const commissionInUSD = soldInUSD * comissionPercentSell +
                                boughtInUSD * comissionPercentBuy;

        if (this.isLong()) {
            this.gain = soldInUSD - boughtInUSD - commissionInUSD;

            if ( this.currentPrice > this.takePriceReached)
                { this.takePriceReached = this.currentPrice; }

            if ( this.currentPrice < this.lossPriceReached)
                { this.lossPriceReached = this.currentPrice; }

        }
        else { // sell
            this.gain = boughtInUSD - soldInUSD - commissionInUSD;

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
            quantity: this.quantity,
            active: ( this.active ? 'Y' : 'N'),
            broker: ( this.broker ? 'Y' : 'N'),
            result: this.result,
            closeTime: this.closeTime,
            closePrice: this.closePrice,
            gain: this.gain,
            takePriceReached: this.takePriceReached,
            takePercentReached: this.takePercentReached,
            lossPriceReached: this.lossPriceReached,
            lossPercentReached: this.lossPercentReached,
            comment:  this.comment + this.tagsStringify(),
            flags: {},
            tags: {},
            brokerORID: this.brokerORID,
            brokerSLID: this.brokerSLID,
            brokerTPID: this.brokerTPID
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
            quantity: this.quantity ,
            active: ( this.active ? 'Y' : 'N'),
            broker: ( this.broker ? 'Y' : 'N'),
            result: this.result,
            closeTime: this.closeTime,
            closePrice: this.closePrice,
            gain: this.gain,
            takePriceReached: this.takePriceReached,
            takePercentReached: this.takePercentReached,
            lossPriceReached: this.lossPriceReached,
            lossPercentReached: this.lossPercentReached,
            comment:  this.comment,
            flags: JSON.stringify(this.flags),
            tags: JSON.stringify(this.tags),
            brokerORID: this.brokerORID,
            brokerSLID: this.brokerSLID,
            brokerTPID: this.brokerTPID
        }
    }

    static fromSTORE(data)
    {
        let order = new Order({
                time: data.time,
                strategy: data.strategy,
                symbol: data.symbol,
                timeframe: data.timeframe,
                isLong: (data.type === Order.TYPE.BUY),
                entryPrice: data.entryPrice,
                quantity: data.quantity,
                stopLoss: data.stopLoss,
                takeProfit: data.takeProfit                 
        });
         
        order.active = ( data.active == 'Y');
        order.broker = ( data.broker == 'Y');
        order.result = data.result;
        order.closePrice = data.closePrice;
        order.gain = data.gain;
        order.takePriceReached = data.takePriceReached;
        order.takePercentReached = data.takePercentReached;
        order.lossPriceReached = data.lossPriceReached;
        order.lossPercentReached = data.lossPercentReached;

        order.comment =  data.comment;
        order.flags = JSON.parse(data.flags);
        order.tags = JSON.parse(data.tags);
        order.brokerORID = data.brokerORID;
        order.brokerSLID = data.brokerSLID;
        order.brokerTPID = data.brokerTPID;

        return order;
    }
    
}

module.exports = Order;
