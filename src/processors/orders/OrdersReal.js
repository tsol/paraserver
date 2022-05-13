const UserEventsInterface = require('../../brokers/types/BrokerEventsUserInterface.js');

class OrdersReal extends UserEventsInterface {
    
    constructor(broker, clients) {
        super();
        this.broker = broker;
        this.orders = [];
        this.clients = clients;

        broker.subscribe(this);
    }

    reset() {
    }

    onBrokerOrderCanceled(id) {
        console.log('ON_BROKER_ORDER_CANCELED '+id);
        this.cleanSLTPOrders(id);
    }
    
    onBrokerOrderFilled(id) {
        console.log('ON_BROKER_ORDER_FILLED '+id);
        this.cleanSLTPOrders(id);
    }
    
    onAccountUpdate(balance,pnl,positions) {
        
        console.log('ON_ACCOUNT_UPDATE balance='+balance+' pnl='+pnl+' positions: ');
        console.log(positions);

        this.clients.onAccountUpdate(balance,pnl,positions);
    }

    cleanSLTPOrders( broker_SL_or_TP_OrderId ) {
        const id = broker_SL_or_TP_OrderId;

        console.log('OM: searching for rouge SL/TP leftover orders...');

        let order = this.orders.find( o =>
             o.real && ( o.real.orders.sl.id == id || o.real.orders.tp.id == id  )
        );
        if (!order) { return; }

        console.log('OM: found SL/TP orders to clean up: '+JSON.stringify(order.id));
        const bo = order.real.orders;
        let removeId = ( bo.sl.id == id ? bo.tp.id : bo.sl.id );

        this.broker.closeOrderIds( order.symbol, [ removeId ])
            .then((r) => {
                console.log("OM: removed ok id="+removeId);
            })
            .catch((err) => {
                console.log("OM: remove error ="+err.message);
            })

    }

    newOrder(
        time,
        strategy,
        symbol,
        timeframe,
        isLong,
        entryPrice, 
        takeProfit, 
        stopLoss,
        comment,
        flags 
    ) {
    }

    getOrder(orderId) {
        return this.orders.find( o => o.id === orderId);
    }

    addOrder(order) {
        if (! this.getOrder( order.id )) {
            this.orders.push(order);
        }
    }

    async newOrderFromEmu(emulatedOrder) {
        const e = emulatedOrder;
        try {
            const result = await this.broker.makeMarketOrder(
                e.symbol,
                e.isLong(),
                e.quantity,
                e.stopLoss,
                e.takeProfit
            );

            console.log('ORDER_REAL: OK');
            console.log(result);
            
            e.setBrokerTrue();
            e.setBrokerORID(result.entry.id);
            e.setBrokerSLID(result.sl.id);
            e.setBrokerTPID(result.tp.id);

            this.addOrder(e);

            return result;
        }
        catch (err)
        {
            console.log('ORDER_REAL: ERROR');
            console.log(err);
            throw err;
        };

    }


    candleClosed(candle,isLive) {
    }

    candleUpdated(candle,isLive) {
    }


}

module.exports = OrdersReal;

