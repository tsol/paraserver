
const SETTINGS = require('./private/private.js');

const { Server } = require("socket.io");

const DataProcessor = require('./src/processors/DataProcessor.js');
const BinanceSource = require('./src/brokers/binance/BinanceSource.js');
const BinanceClient = require('./src/brokers/binance/BinanceClient.js');
const OrdersManager = require('./src/processors/OrdersManager.js');
const MysqlDB = require('./src/db/MysqlDB.js');
const CandleDB = require('./src/db/CandleDB.js');
const AnalyzersFactory = require('./src/analyzers/AnalyzersFactory.js');

const brokerSrc = new BinanceSource(SETTINGS.users.harry.brokers.binance);
const ordersManager = new OrdersManager();
const mysqlHandler = new MysqlDB();
const analyzersFactory = new AnalyzersFactory();

const io = new Server({
    cors: {
        origin: [ /localhost/, /192\.168/, "http://192.168.1.10:8080" ],
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});

let dataProcessor = null;
let binanceClient = null;

mysqlHandler.connect( SETTINGS.databases.mysql ).then( () => {

    const candleDB = new CandleDB(mysqlHandler, [ brokerSrc ]);
    dataProcessor = new DataProcessor(ordersManager,candleDB,analyzersFactory);

    dataProcessor.runSymbols([
        { symbol: 'BTCUSDT', broker: brokerSrc },
    ]);

/*
    
    dataProcessor.runSymbols([
        { symbol: 'LUNAUSDT', broker: brokerSrc },
        { symbol: 'AVAXUSDT', broker: brokerSrc },
        { symbol: 'BTCUSDT', broker: brokerSrc },
        { symbol: 'SOLUSDT', broker: brokerSrc }
    ]);

    binanceClient = new BinanceClient(SETTINGS.users.mona.brokers.binance, dataProcessor);
    binanceClient.updateAccountInfo().then( () => {
        binanceClient.updateMyTrades('USDT').then( () => {
            binanceClient.getMyTrades().forEach( (trade) => {
                dataProcessor.runSymbols([{ symbol: trade.symbol, broker: brokerSrc }]);   
            })
        })
    })
*/

});


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

    socket.on("list_tickers", (arg) => {
        if (!dataProcessor) return;
        let data = dataProcessor.getTickersState();
        //console.log('SENDING_TICKERS: '+JSON.stringify(data))
        socket.emit("tickers", data);
    });

    socket.on("list_orders", (arg) => {
        if (!dataProcessor) return;
        let data = ordersManager.toJSON();
        socket.emit("orders", data);
    });

    socket.on("broker_my_trades", (arg) => {
        if (!binanceClient) return;
        let data = binanceClient.getMyTradesJSON();
        socket.emit('broker_my_trades', data);
    });

});

io.listen(3005);

