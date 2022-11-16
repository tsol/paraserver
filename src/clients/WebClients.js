const { Server } = require("socket.io");
const SETTINGS = require('../../private/private.js');

class WebClients {

    constructor() {
        this.sockets = [];
        this.clientIO = null;
    }
 
    start(clientIO)
    {
        this.clientIO = clientIO;

        const io = new Server({
            cors: {
                origin: SETTINGS.cors_origin,
                methods: ["GET", "POST"],
                credentials: true
              },
            allowEIO3: true
        });
        
        io.on("connection", (socket) => {
    
            this.addSocket(socket);
        
            socket.on('disconnect', (arg) => {
                this.removeSocket(socket);
            });
        
            socket.on("get_chart", (arg) => {

                if (! arg.tickerId ) {
                    console.log('SIO: invalid get_chart params');
                }
        
                let [symbol, timeframe] = arg.tickerId.split('-');      
        
                let param = {
                    symbol: symbol,
                    timeframe: timeframe,
                    limit: (arg.limit ? arg.limit : 1000)
                }
            
                if (arg.timestamp) { param.timestamp = arg.timestamp; }
        
                clientIO.getTickerChart(param)
                    .then( data => socket.emit("chart", data) )
                    .catch( err => console.log('SIO: getTickerChart error', err) );

            });
        
            socket.on("get_flags", (arg) => {
                socket.emit("chart_flags", clientIO.getTickerFlags(arg.tickerId) );
            });
        
            socket.on("list_tickers", (arg) => {
                let data = clientIO.getTickersState();
                socket.emit("tickers", data);
            });
        
            socket.on("list_entries", (arg) => {
                let data = clientIO.getEntriesList();
                socket.emit("entries", data);
            });

            socket.on("list_orders", (arg) => {
                let data = clientIO.getOrdersList(arg);
                socket.emit("orders", data);
            });
        
            socket.on("get_entry", (arg) => {
                let data = clientIO.getEntry(arg.entryId);
                socket.emit("entry", data);
            });

            socket.on("get_ep_params", (arg) => {
                let data = clientIO.getEntryPlanParams();
                socket.emit("ep_params", data);
            });

            socket.on("set_ep_params", (arg) => {
                let reply = clientIO.setEntryPlanParams(arg);
                socket.emit("ep_params_set", reply);
            });

            socket.on("get_orders_report", (arg) => {
                try {
                    console.log('generating report...');
                    if (arg.dateFrom) { arg.dateFrom = (new Date(arg.dateFrom)).getTime(); };
                    if (arg.dateTo)   { arg.dateTo = (new Date(arg.dateTo)).getTime(); };
        
                    let ordersReport = clientIO.getReport(arg);
                    console.log('sending report...');
                    socket.emit("orders_report", ordersReport );
                }
                catch (err) {
                    console.log("REPORT_ERROR: "+err.message);
                    socket.emit("orders_report", [{ periodName: err.message }] )
                }
            });   

            socket.on("get_timeframes", () => {
                socket.emit("timeframes", clientIO.getTimeframes());
            });

            socket.on("get_symbols", () => {
                socket.emit("symbols", clientIO.getAllSymbols());
            });

            socket.on("get_strategies", () => {
                socket.emit("strategies", clientIO.getStrategies());
            });

            socket.on("get_tags", () => {
                socket.emit("tags", clientIO.getTagDescriptions());
            });

            socket.on("make_real_order", async (arg) => {
                console.log('make_real_order');
                socket.emit("new_real_order", 
                    await clientIO.doMakeOrderFromEmulated(arg.orderId)
                );
            });
/*
            socket.on("get_orders_stats", (arg) => {
                let orderStats = clientIO.getOrdersStatistics(arg.fromTimestamp, arg.toTimestamp);
                let timeframes = clientIO.getTimeframes();
                socket.emit("orders_stats", { timeframes: timeframes, stats: orderStats });
            });
        

        */
        
        });
        
        io.listen(3005);
        console.log('===> READY FOR CONNECTIONS')

    }

    addSocket(socket)
    {
        console.log('SC: client connected')
        this.sockets.push(socket);
    }

    removeSocket(socket)
    {
        console.log('SC: client disconnected');
        this.sockets = this.sockets.filter( (s) => s !== socket );
    }

    emit(command, data) {
        console.log('SC: emitting command '+command+' to '+this.sockets.length+' client sockets.');
        this.sockets.forEach( (s) => s.emit(command, data) );
    }


}

module.exports = WebClients;
