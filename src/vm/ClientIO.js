
class ClientIO {

    constructor(vm) {
        this.vm = vm;
    }
 
    restartAll(runLive) {        
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

    getTickerChart({ symbol, timeframe, limit, timestamp } ) {
        // todo: load from candleProxy
        // todo2: load from DB + LEFT JOIN candleDebug

        const ticker = this.vm.getProcessor().getTicker(symbol,timeframe);
        if (! ticker ) { return null; }

        return ticker.getChart(limit,timestamp);

    }

    getTickersState() {
        return this.vm.getProcessor().getTickersState();
    }
    
    getCurrentPrice(symbol) {
        return this.vm.getProcessor().getLastPrice(symbol);
    }

    getOrdersList() {
        return this.vm.getOrdersManager().getEmulatedOrdersList();
    }

    getOrder(orderId) {
        return this.vm.getOrdersManager().getEmulatedOrder(orderId);
    }

    getReport(params) {
        return this.vm.getOrdersManager().getReport(params);
    }

    getOrdersStatistics(fromTimestamp, toTimestamp) {
        return this.vm.getOrdersManager().getEmulatedStatistics(fromTimestamp, toTimestamp);
    }

    getTimeframes() {
        return this.vm.getTimeframes();
    }

    async doMakeOrderFromEmulated(emOrderId) {
        return this.vm.getOrdersManager().doMakeOrderFromEmulated(emOrderId);
    }

}

module.exports = ClientIO;