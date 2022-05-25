/* 
** VM object, containing one virtual trading bot system.
**
*/

const OrdersManager = require("./Orders/OrdersManager");
const VMCandleProcessor = require("./Processor/VMCandleProcessor");
const CandleSequencer = require('./Sequencer/CandleSequencer');

class VM {

    constructor(dataDB, candleProxy, brokerUser, clients) {
        this.dataDB = dataDB;
        this.brokerUser = brokerUser;
        this.candleProxy = candleProxy;
        this.clients = clients;
        this.ordersManager = new OrdersManager(brokerUser,candleProxy.getBroker(),clients);
        this.processor = new VMCandleProcessor(this.ordersManager);
        this.sequencer = null;

        this.symbols = null;
        this.timeframes = null;
        this.strategies = null;
        this.fromTime = null;
        this.toTime = null;
        this.options = null;
    }

    getBrokerUser() { return this.brokerUser; }
    getCandleProxy() { return this.candleProxy; }
    getSequencer() { return this.sequencer; };
    getProcessor() { return this.processor; }
    getOrdersManager() { return this.ordersManager; }
    getTimeframes() { return this.timeframes; }

    async init(symbols,timeframes,strategies,fromTime,toTime,options)
    {
        this.symbols = symbols;
        this.timeframes = timeframes;
        this.strategies = strategies;
        this.fromTime = fromTime;
        this.toTime = toTime;
        this.options = options;

        this.processor.init(symbols,timeframes);

        this.sequencer = new CandleSequencer(symbols,timeframes,
            this.candleProxy,this.processor);

        return await this.sequencer.init(fromTime, toTime);
    }
 
    //todo: add/remove symbol, timeframe, strategy, moveFrom, moveTo, switchLive

}

module.exports = VM;
