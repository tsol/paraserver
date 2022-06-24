const { TF } = require('./Timeframes');

class Order {

    constructor({ entryObj, quantity })
    {
        this.entry = entryObj;  
        this.quantity = quantity;
        this.tags = {};

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

    /* export/import IO */

    toGUI() {
        return {
            id: this.entry.id,
            entry: this.entry.toGUI(),
            quantity: this.quantity
        }
    }
    
}

module.exports = Order;
