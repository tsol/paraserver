
class DBProviderInterface {

    // db interface for CandleDebug entity
    getCandleDebugIO() {
        return {
            update: (con, vmId, obj) => {},
            save: (con, vmId, objArray) => {},
            load: (con, vmId, {symbol, timeframe, timeFrom, timeTo}) => {},
            reset: (con, vmId) => {}
        }
    }

    connect(params) { return Promise.resolve(null) } // resolves connection variable 
    disconnect() {}

}

module.exports = DBProviderInterface;