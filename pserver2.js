const { Server } = require("socket.io");

const DataProcessor = require('./src/processors/DataProcessor.js');
const BinanceSource = require('./src/brokers/binance/BinanceSource.js');
const BinanceClient = require('./src/brokers/binance/BinanceClient.js');
const OrdersManager = require('./src/processors/OrdersManager.js');

const ordersManager = new OrdersManager();
const dataProcessor = new DataProcessor(ordersManager);

const USERS = require('./private/private.js');

const binanceClient = new BinanceClient(USERS.users.mona.brokers.binance, dataProcessor);
const brokerSrc = new BinanceSource(USERS.users.harry.brokers.binance);


dataProcessor.runSymbols([
    { symbol: 'LUNAUSDT', broker: brokerSrc },
    { symbol: 'AVAXUSDT', broker: brokerSrc },
    { symbol: 'BTCUSDT', broker: brokerSrc },
    { symbol: 'SOLUSDT', broker: brokerSrc }
]);

const io = new Server({
    cors: {
        origin: [ /localhost/, /192\.168/, "http://192.168.1.10:8080" ],
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});


binanceClient.updateAccountInfo().then( () => {
    binanceClient.updateMyTrades('USDT').then( () => {
        binanceClient.getMyTrades().forEach( (trade) => {
            dataProcessor.runSymbols([{ symbol: trade.symbol, broker: brokerSrc }]);   
        })
    })
})


io.on("connection", (socket) => {
    console.log('client connected')

    socket.on("get_chart", (arg) => {
        let [symbol, timeframe] = arg.split('-');
        let data = dataProcessor.getTickerChart(symbol, timeframe);
        socket.emit("chart", data);
    });

    socket.on("list_tickers", (arg) => {
        let data = dataProcessor.getTickersState();
        //console.log('SENDING_TICKERS: '+JSON.stringify(data))
        socket.emit("tickers", data);
    });

    socket.on("list_orders", (arg) => {
        let data = ordersManager.toJSON();
        socket.emit("orders", data);
    });

    socket.on("broker_my_trades", (arg) => {
        let data = binanceClient.getMyTradesJSON();
        socket.emit('broker_my_trades', data);
    });

});

io.listen(3005);
