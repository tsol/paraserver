const { TF } = require('./Timeframes');
const { fnum } = require('../reports/helper.js');

class Order {

    constructor( entryObj, quantity )
    {
        this.entry = entryObj;  
        this.quantity = quantity;
        this.gain = 0;
        this.tags = {};
        this.wallet = 0;
        this.stake = 0;

        // RealOrder

        //this.brokerORID = null;
        //this.brokerSLID = null;
        //this.brokerTPID = null;

    }


    getTagValue(tagName) { 
        if ( this.tags[tagName] ) {
            return this.tags[tagName].value;
        }
        return this.entry.getTagValue(tagName);
    }

    setTag(tagName,tagValue) { this.tags[tagName] = { value: tagValue } };
    setTags(tags) { this.tags = tags; }
    setQuantity(q) { this.quantity = q; }
    setGain(g) {this.gain = g;}
    setWallet(w) { this.wallet = w; }
    setStake(s) { this.stake = s; }
    /* export/import IO */

    toGUI() {
        return {
            ... this.entry,
            quantity: this.quantity,
            gain: fnum(this.gain,3),
            wallet: fnum(this.wallet,3),
            stake: fnum(this.stake,3)
        }
    }
    
}

module.exports = Order;
