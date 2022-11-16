/* This is interface for all our possible clients's requests.
** 
** Telegram Bot or WebSockets http client - all get this object as their
** interface to the system.
*/

class ClientIO {

    constructor(vm) {
        this.vm = vm;
    }
 
    getAllSymbols() {
        const seq = this.vm.getSequencer();
        if (! seq) { return []; }
        return seq.getSymbols();
    }

    async getAccountInformation() {
        return this.vm.getBrokerUser().getAccountInformation();
    }

    getTickerFlags(tickerId) {
        return this.vm.getProcessor().getFlags().getAllFlagsByTickerId(tickerId);
    }

    async getTickerChart({ symbol, timeframe, limit, timestamp } ) {

        const candlesDB = this.vm.getCandleProxy();
        const cdebugDB = this.vm.getCandleDebugDB();

        const borders = await candlesDB.getPeriodBordersFromDB(
                symbol, timeframe, timestamp, limit);
        
        const candles = await candlesDB.getCandlesPeriod( symbol, timeframe, 
            borders.startTimestamp,
            borders.endTimestamp,
            false
        );
 
        const cdebug = await cdebugDB.load({symbol, timeframe,
            timeFrom: borders.startTimestamp,
            timeTo: borders.endTimestamp
        });

        return {
            id: symbol+'-'+timeframe,
            candles: candles,
            cdebug: cdebug,
            targetTimestamp: timestamp
        }
        
    }

    getTickersState() {
        return this.vm.getProcessor().getTickersState();
    }
    
    getCurrentPrice(symbol) {
        return this.vm.getProcessor().getLastPrice(symbol);
    }

    getEntriesList() {
        return this.vm.getOrdersManager().getEntriesList();
    }

    getOrdersList(args) {
        return this.vm.getOrdersManager().getOrdersList(args);
    }

    getEntryPlanParams() {
        return this.vm.getOrdersManager().getEntryPlanParams();
    }

    setEntryPlanParams(params) {
        return this.vm.getOrdersManager().setEntryPlanParams(params);
    }

    getEntry(entryId) {
        return this.vm.getOrdersManager().getEntryById(entryId);
    }

    getReport(params) {
        return this.vm.getOrdersManager().getReport(params);
    }

    getOrdersStatistics(fromTimestamp, toTimestamp) {
        //return this.vm.getOrdersManager().getEmulatedStatistics(fromTimestamp, toTimestamp);
    }

    getTimeframes() {
        return this.vm.getTimeframes();
    }

    getStrategies() {
        return this.vm.getStrategies();
    }

    getTagDescriptions() {
        return this.vm.getOrdersManager().getTagDescriptions();
    }

    async doMakeOrderFromEmulated(emOrderId) {
        return this.vm.getOrdersManager().doMakeOrderRealById(emOrderId);
    }


}

module.exports = ClientIO;
