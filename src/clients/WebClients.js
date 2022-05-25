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
        
                let data = clientIO.getTickerChart(param);
                socket.emit("chart", data);
            });
        
            socket.on("get_flags", (arg) => {
                socket.emit("chart_flags", clientIO.getTickerFlags(arg.tickerId) );
            });
        
            socket.on('restart_all', (arg) => {
        
                console.log('=====> RESTART START')
                
                clientIO.restartAll(arg.runLive);
                
                console.log('=====> RESTART END')
        
                let data = clientIO.getOrdersList();
                socket.emit("orders", data);
        
            });
        
            socket.on("list_tickers", (arg) => {
                let data = clientIO.getTickersState();
                socket.emit("tickers", data);
            });
        
            socket.on("list_orders", (arg) => {
                let data = clientIO.getOrdersList();
                socket.emit("orders", data);
            });
        
        
            socket.on("get_order", (arg) => {
                let data = clientIO.getOrder(arg.orderId);
                socket.emit("order", data);
            });
        
        
            socket.on("make_real_order", (arg) => {
                socket.emit("new_real_order", 
                    clientIO.doMakeOrderFromEmulated(arg.orderId)
                );
            });
        
            socket.on("get_orders_stats", (arg) => {
                let orderStats = clientIO.getOrdersStatistics(arg.fromTimestamp, arg.toTimestamp);
                let timeframes = clientIO.getTimeframes();
                socket.emit("orders_stats", { timeframes: timeframes, stats: orderStats });
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
