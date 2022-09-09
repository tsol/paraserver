
class DBProviderInterface {

    getCandleDebugIO() {
        return {
            update: ({con, vmId, symbol, timeframe, time, entries}) => {},
            save: ({con, vmId, symbol, timeframe, time, entries}) => {},
            load: ({con, vmId, symbol, timeframe, timeFrom, timeTo}) => {},
            reset: ({con, vmId}) => {}
        }
    }

    connect(params) { return Promise.resolve(null) } // resolves connection variable 
    disconnect() {}

}

module.exports = DBProviderInterface;