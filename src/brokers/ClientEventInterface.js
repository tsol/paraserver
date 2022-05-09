/*
** This is what BrokerClient (BrokerOrdersIO) event processor must do
*/

class ClientEventsInterface
{

    onBrokerOrderCanceled(id) {
        console.log('ON_BROKER_ORDER_CANCELED '+id);
    }

    onBrokerOrderFilled(id) {
        console.log('ON_BROKER_ORDER_FILLED '+id);
    }

    onAccountUpdate(balance,pnl,positions) {
        console.log('ON_ACCOUNT_UPDATE balance='+balance);
    }

}

module.exports = ClientEventsInterface;