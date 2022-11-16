
// todo: should accept manipulate RealOrder class

const UserEventsInterface = require('../../brokers/types/BrokerEventsUserInterface.js');
const OrderReal = require('../../types/OrderReal');

class OrdersReal extends UserEventsInterface {
    
    constructor(brokerUser, clients) {
        super();
        this.broker = brokerUser;
        this.orders = [];
        this.clients = clients;

        brokerUser.subscribe(this);
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
             ( o.brokerSLID == id || o.brokerTPID == id  )
        );
        if (!order) { return; }
        
        let removeId = ( order.brokerSLID == id ? order.brokerTPID : order.brokerSLID );

        console.log('OM: found SL/TP orders to clean up: order=', order.entry.id, ' removeId=', removeId);

        this.broker.closeOrderIds( order.getSymbol(), [ removeId ])
            .then((r) => {
                console.log("OM: removed ok id="+removeId);
            })
            .catch((err) => {
                console.log("OM: remove error ="+err.message);
            })

    }


    getOrder(orderId) {
        return this.orders.find( o => o.getId() === orderId);
    }

    addOrder(order) {
        if (! this.getOrder( order.getId() )) {
            this.orders.push(order);
        }
    }

    async makeMarketOrder( emulatedOrder ) {
        const e = emulatedOrder;
        try {

            const result = await this.broker.makeMarketOrder(
                e.getSymbol(),
                e.getIsLong(),
                e.getQuantity(),
                e.getStopLoss(),
                e.getTakeProfit()
            );
            
            //const result = { entry: { id: 1 }, sl: { id: 1 }, tp: {id: 1} };

            console.log('ORDER_REAL: OK');
            console.log(result);
            
            const realOrder = new OrderReal( 
                { ... e.entry },
                e.getQuantity(),
                result.entry.id,
                result.sl.id,
                result.tp.id
            )

            this.addOrder(realOrder);

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

