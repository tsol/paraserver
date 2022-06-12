/*
    Orders Tagger - sets tags on orders 
*/

class Tagger {

    constructor(params) {
        this.reset();
        this.params = params;
    }

    reset() {
    }

    hourlyTick(order,flags,orders,hour) {}    
    dailyTick(order,flags,orders,day) {}
    weeklyTick(order,flags,orders,week) {}
    monthlyTick(order,flags,orders,month) {} 

    getTags(order, flags, orders, tags) 
    {
        return {
            TAGNAME: { value: 'TAGVALUE' },
        }

    }


}

module.exports = Tagger;

