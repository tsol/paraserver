
const SETTINGS = require('./private/private.js');

const { Server } = require("socket.io");
const SocketClients = require("./src/processors/SocketClients.js");

const DataProcessor = require('./src/processors/DataProcessor.js');
const OrdersManager = require('./src/processors/orders/OrdersManager.js');

const Brokers = require('./src/brokers/Brokers.js');
const BinanceSourceUSDM = require('./src/brokers/binance/BinanceSourceUSDM.js');
const BinanceClientUSDM = require('./src/brokers/binance/BinanceClientUSDM.js');

const BinanceSpotKoto = require('./src/brokers/binance/BinanceSpotKoto.js');

const MysqlDB = require('./src/db/MysqlDB.js');
const CandleDB = require('./src/db/CandleDB.js');

const brokerBinanceSrc = new BinanceSourceUSDM(SETTINGS.users.harry.brokers.binance);
const brokerClientUSDM = new BinanceClientUSDM(SETTINGS.users.utah.brokers.binance);

const brokers = new Brokers();
brokers.addBroker(brokerBinanceSrc);

const mysqlHandler = new MysqlDB();

let dataProcessor = null;
let ordersManager = null;
let candleDB = null;

const clients = new SocketClients();

const io = new Server({
    cors: {
        origin: [ /localhost/, /192\.168/, /176\.112\.193\.180/ ],
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});

const runLive = true;

const coins = [ 'BTCUSDT','ANCUSDT','LUNAUSDT','WAVESUSDT',
                'ARUSDT','ATOMUSDT','UNIUSDT','FILUSDT',
                'AVAXUSDT','SOLUSDT','SRMUSDT', 'ZRXUSDT'
];

//const coins = [ 'BTCUSDT' ];

mysqlHandler.connect( SETTINGS.databases.mysql ).then( () => {
    brokerClientUSDM.init().then( () => {

        candleDB = new CandleDB(mysqlHandler, brokers);
        ordersManager = new OrdersManager(brokerClientUSDM, clients);
        dataProcessor = new DataProcessor(mysqlHandler,brokers,candleDB,ordersManager,clients);
    
        brokerBinanceSrc.getTradableSymbols().then( (symbols) => {
            dataProcessor.runSymbols(symbols, runLive);
        });
/*
    binanceKoto = new BinanceSpotKoto(SETTINGS.users.mona.brokers.binance, dataProcessor);
    binanceKoto.updateAccountInfo().then( () => {
        binanceKoto.updateMyTrades('USDT').then( () => {
            
            binanceKoto.getMyTrades().forEach( (trade) => {
                if (! coins.find(c => c === trade.symbol) )
                    { coins.push(trade.symbol); }
            })

            console.log('SYMBOLS: '+JSON.stringify(coins));
            dataProcessor.runSymbols(coins, runLive);

        })
    })
*/
    })
});


console.log('===> READY FOR CONNECTIONS')

io.on("connection", (socket) => {
    
    clients.connect(socket);

    socket.on('disconnect', (arg) => {
        clients.disconnect(socket);
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

        //let data = dataProcessor.getTickersState();
        //socket.emit("tickers", data);
    });

    socket.on("list_tickers", (arg) => {
        if (!dataProcessor) return;
        let data = dataProcessor.getTickersState();
        //console.log('SENDING_TICKERS: '+JSON.stringify(data))
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

    socket.on("broker_my_trades", (arg) => {
        if (!binanceKoto) return;
        let data = binanceKoto.getMyTradesJSON();
        socket.emit('broker_my_trades', data);
    });

});

io.listen(3005);

