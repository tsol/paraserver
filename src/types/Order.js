const { TF } = require('./Timeframes');
const { fnum } = require('../processors/orders/statfilters/helper.js');

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


/*
  strategyObject - remove

*/

    constructor({ time,strategy,symbol,timeframe,isLong,entryPrice,quantity,stopLoss,takeProfit })
    {

        this.id = symbol+'-'+timeframe+'-'+time;
        this.time = time;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.strategy = strategy;
        this.type = ( isLong ? Order.TYPE.BUY : Order.TYPE.SELL );
        
        this.quantity = quantity;
        this.entryPrice = entryPrice;
        this.takeProfit = takeProfit;
        this.stopLoss = stopLoss;

        this.active = true;
        this.broker = false;
        this.db = false;
        this.result = Order.RESULT.ACTIVE; 
        this.flags = null;
        this.tags = {}

        this.closePrice = null;
        this.gain = 0;
        this.maxPriceReached = entryPrice;
        this.reachedPercent = 0;
        this.comment = ''; 
     
        this.brokerORID = null;
        this.brokerSLID = null;
        this.brokerTPID = null;

    }

    setQuantity(q) { this.quantity = q; }
    setBrokerORID (id) { this.brokerORID = id; }
    setBrokerSLID (id) { this.brokerSLID = id; }
    setBrokerTPID (id) { this.brokerORID = id; }


    tagsStringify()
    {
        let res = '';
        for (const tag in this.tags) {
            res += ' '+tag+':'+tagsObject[tag].value+
                ( tagsObject[tag].comment ? ' ['+tagsObject[tag].comment+']' : '');
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
            quantity: this.quantity ,
            active: ( this.active ? 'Y' : 'N'),
            broker: ( this.broker ? 'Y' : 'N'),
            result: this.result,
            closePrice: this.closePrice,
            gain: this.gain,
            maxPriceReached: this.maxPriceReached,
            reachedPercent: this.reachedPercent,
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
            closePrice: this.closePrice,
            gain: this.gain,
            maxPriceReached: this.maxPriceReached,
            reachedPercent: this.reachedPercent,
            comment:  this.comment,
            flags: JSON.stringify(this.flags),
            tags: JSON.stringify(this.tags),
            brokerORID: this.brokerORID,
            brokerSLID: this.brokerSLID,
            brokerTPID: this.brokerTPID
        }
    }

    fromSTORE(data)
    {
            this.id = data.id;
            this.time = data.time;
            this.type =  data.type;
            this.symbol = data.symbol;
            this.timeframe = data.timeframe;
            this.strategy = data.strategy;
            this.entryPrice = data.entryPrice;
            this.takeProfit = data.takeProfit;
            this.stopLoss = data.stopLoss;
            this.quantity = data.quantity ;
            this.active = ( data.active == 'Y');
            this.broker = ( data.broker == 'Y');
            this.result = data.result;
            this.closePrice = data.closePrice;
            this.gain = data.gain;
            this.maxPriceReached = data.maxPriceReached;
            this.reachedPercent = data.reachedPercent;
            this.comment =  data.comment;
            this.flags = JSON.parse(data.flags);
            this.tags = JSON.parse(data.tags);
            this.brokerORID = data.brokerORID;
            this.brokerSLID = data.brokerSLID;
            this.brokerTPID = data.brokerTPID
    }
    
}

module.exports = Order;
