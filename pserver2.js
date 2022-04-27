
const SETTINGS = require('./private/private.js');

const { Server } = require("socket.io");
const WebClients = require("./src/processors/WebClients.js");

const DataProcessor = require('./src/processors/DataProcessor.js');
const OrdersManager = require('./src/processors/orders/OrdersManager.js');

const Brokers = require('./src/brokers/Brokers.js');
const BinanceSourceUSDM = require('./src/brokers/binance/BinanceSourceUSDM.js');
const BinanceClientUSDM = require('./src/brokers/binance/BinanceClientUSDM.js');

const MysqlCandles = require('./src/db/MysqlCandles.js');
const CandleDB = require('./src/db/CandleDB.js');
const { SET } = require('mysql/lib/protocol/constants/types');

const brokerBinanceSrc = new BinanceSourceUSDM(SETTINGS.users.harry.brokers.binance);
const brokerClientUSDM = new BinanceClientUSDM(SETTINGS.users.utah.brokers.binance);

const brokers = new Brokers();
brokers.addBroker(brokerBinanceSrc);

const mysqlCandles = new MysqlCandles();

let dataProcessor = null;
let ordersManager = null;
let candleDB = null;

const webClients = new WebClients();

const io = new Server({
    cors: {
        origin: SETTINGS.cors_origin,
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});

const runLive = ( typeof(SETTINGS.runLive) != "undefined" ? SETTINGS.runLive : true );


mysqlCandles.connect( SETTINGS.databases.mysqlCandles ).then( () => {
    brokerClientUSDM.init().then( () => {

        candleDB = new CandleDB(mysqlCandles, brokers);
        ordersManager = new OrdersManager(brokerClientUSDM, webClients);
        dataProcessor = new DataProcessor(null,brokers,candleDB,ordersManager,webClients);
    
        if (!SETTINGS.dev) {

            brokerBinanceSrc.getTradableSymbols().then( (symbols) => {
                symbols.forEach( s => dataProcessor.runSymbols([s], runLive) );
                //dataProcessor.runSymbols(symbols, runLive);
            });
    
        }
        else {

            brokerBinanceSrc.getTradableSymbols().then( (symbols) => { 
                let coins = ( typeof(SETTINGS.debugSymbols) != "undefined" ? SETTINGS.debugSymbols : symbols );                
                coins.forEach( s => dataProcessor.runSymbols([s], runLive) );
            });
        }

    })
});


console.log('===> READY FOR CONNECTIONS')

io.on("connection", (socket) => {
    
    webClients.connect(socket);

    socket.on('disconnect', (arg) => {
        webClients.disconnect(socket);
    });

    socket.on("get_chart", (arg) => {
        if (!dataProcessor) return;

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

        let data = dataProcessor.getTickerChart(param);
        socket.emit("chart", data);
    });

    socket.on("get_flags", (arg) => {
        if (!dataProcessor) return;
        socket.emit("chart_flags", dataProcessor.getTickerFlags(arg.tickerId) );
    });

    socket.on('restart_all', (arg) => {
        if (!dataProcessor) return;

        console.log('=====> RESTART START')
        
        dataProcessor.restartAll(arg.runLive);
        
        console.log('=====> RESTART END')

        let data = dataProcessor.getOrdersList();
        socket.emit("orders", data);

    });

    socket.on("list_tickers", (arg) => {
        if (!dataProcessor) return;
        let data = dataProcessor.getTickersState();
        socket.emit("tickers", data);
    });

    socket.on("list_orders", (arg) => {
        if (!dataProcessor) return;
        let data = dataProcessor.getOrdersList();
        socket.emit("orders", data);
    });


    socket.on("get_order", (arg) => {
        if (!dataProcessor) return;
        let data = dataProcessor.getOrder(arg.orderId);
        socket.emit("order", data);
    });


    socket.on("make_real_order", (arg) => {
        if (!dataProcessor) return;
        socket.emit("new_real_order", 
            dataProcessor.doMakeOrderFromEmulated(arg.orderId)
        );
    });

    socket.on("get_orders_stats", (arg) => {
        if (!dataProcessor) return;
        let orderStats = dataProcessor.getOrdersStatistics(arg.fromTimestamp, arg.toTimestamp);
        let timeframes = dataProcessor.getTimeframes();
        socket.emit("orders_stats", { timeframes: timeframes, stats: orderStats });
    });

    socket.on("get_orders_report", (arg) => {
        if (!dataProcessor) return;
        try {
            console.log('generating report...');
            if (arg.dateFrom) { arg.dateFrom = (new Date(arg.dateFrom)).getTime(); };
            if (arg.dateTo)   { arg.dateTo = (new Date(arg.dateTo)).getTime(); };

            let ordersReport = dataProcessor.getReport(arg);
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

