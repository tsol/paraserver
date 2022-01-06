class Brokers {

    constructor ()
    {
        this.brokers = [];
    }

    addBroker(broker)
    {
        this.brokers.push(broker);        
    }

    getFor(symbol)
    {
        if (! this.brokers || this.brokers.length === 0 ) { return null; }

        for (let b of this.brokers) {
            if (b.hasSymbol(symbol)) {
                return b;
            }
        }
        return null;        
    }


}


module.exports = Brokers;