
const SETTINGS = require('./private/private.js');

const { Server } = require("socket.io");

const DataProcessor = require('./src/processors/DataProcessor.js');
const Brokers = require('./src/brokers/Brokers.js');
const BinanceSource = require('./src/brokers/binance/BinanceSource.js');
const BinanceClient = require('./src/brokers/binance/BinanceClient.js');
const MysqlDB = require('./src/db/MysqlDB.js');
const CandleDB = require('./src/db/CandleDB.js');

const brokerBinance = new BinanceSource(SETTINGS.users.harry.brokers.binance);
const brokers = new Brokers();
brokers.addBroker(brokerBinance);

const mysqlHandler = new MysqlDB();

let dataProcessor = null;
let binanceClient = null;
let candleDB = null;

const io = new Server({
    cors: {
        origin: [ /localhost/, /192\.168/, "http://192.168.1.10:8080" ],
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});

const runLive = true;

mysqlHandler.connect( SETTINGS.databases.mysql ).then( () => {

    candleDB = new CandleDB(mysqlHandler, brokers);
    dataProcessor = new DataProcessor(mysqlHandler,brokers,candleDB);

    dataProcessor.runSymbols(['BTCUSDT'], runLive);
/*
    dataProcessor.runSymbols([
        'ANCUSDT', 
        'LUNAUSDT',
        'WAVESUSDT',
        'ARUSDT',
        'ATOMUSDT',
        'UNIUSDT',
        'FILUSDT'
    ], runLive );

    dataProcessor.runSymbols([ 'AVAXUSDT', 'SOLUSDT' ], runLive );
    dataProcessor.runSymbols( [ 'SRMUSDT', 'ZRXUSDT', 'MFTUSDT' ], runLive );
*/
    /*
    binanceClient = new BinanceClient(SETTINGS.users.mona.brokers.binance, dataProcessor);
    binanceClient.updateAccountInfo().then( () => {
        binanceClient.updateMyTrades('USDT').then( () => {
            binanceClient.getMyTrades().forEach( (trade) => {
                dataProcessor.runSymbols([ trade.symbol ], runLive);   
            })
        })
    })
*/

});


console.log('===> READY FOR CONNECTIONS')

io.on("connection", (socket) => {
    console.log('client connected')

    socket.on("get_chart", (arg) => {
        if (!dataProcessor) return;

        if (! arg.tickerId ) {
            console.log('SIO: invalid get_chart params');
        }

        let [symbol, timeframe] = arg.tickerId.split('-');      

        let param = {
            symbol: symbol,
            timeframe: timeframe,
            limit: 1000
        }
    
        if (arg.limit) { param.limit = arg.limit; };
        if (arg.timestamp) { param.timestamp = arg.timestamp; }

        let data = dataProcessor.getTickerChart(param);
        socket.emit("chart", data);
    });

    socket.on('restart_all', (arg) => {
        if (!dataProcessor) return;

        console.log('=====> RESTART START')
        
        dataProcessor.restartAll(arg.runLive);
        

        console.log('=====> RESTART END')

        let data = dataProcessor.getOrders();
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
        let data = dataProcessor.getOrders();
        socket.emit("orders", data);
    });


    socket.on("get_orders_stats", (arg) => {
        if (!dataProcessor) return;
        let orderStats = dataProcessor.getOrdersStatistics(arg.fromTimestamp, arg.toTimestamp);
        let timeframes = dataProcessor.getTimeframes();
        socket.emit("orders_stats", { timeframes: timeframes, stats: orderStats });
    });

    socket.on("broker_my_trades", (arg) => {
        if (!binanceClient) return;
        let data = binanceClient.getMyTradesJSON();
        socket.emit('broker_my_trades', data);
    });

});

io.listen(3005);

