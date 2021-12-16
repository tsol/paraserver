const { Server } = require("socket.io");

const Broker = require('./src/brokers/binance/BrokerBinance.js');
const DataProcessor = require('./src/processors/DataProcessor.js');

const dataProcessor = new DataProcessor();

/*
const broker = new Broker(
    {
        apiKey:     'Sx012YCUR2rFGGINH8N6CdT7tSRP0ATqxbxOGzpniI7pgHeb70sUGeXIuz1runwF',
        secretKey:  'iT2cDYfMOdU817kIcA2zFEUYMgM1KpuWx7eKf3o8gKFLs7f2YStFXfOSx6SxIg9c'
    },
    dataProcessor
);
*/

// katya 
const broker = new Broker(
    {
        apiKey:     'q0xkezU4Pcp1VcTxIT8VrR5Z8Q81Clt40HA8NqFCFVdLnHMjiKoupOtQwogCnNgF',
        secretKey:  'nlcSYGg1VgGQFbxqm0FoYNdnwk3MZY5V4L0rl5VE4oWNtrGflDq6ohYd8JUwbqu6'
    },
    dataProcessor
);

broker.updateAccountInfo().then( () => {
    broker.updateMyTrades('USDT').then( () => {
        broker.getMyTrades().forEach( (trade) => {
            broker.startTracking(trade.symbol,'1d','50');
            broker.startTracking(trade.symbol,'1h','50');
            broker.startTracking(trade.symbol,'15m','100');
            broker.startTracking(trade.symbol,'1m','100');    
        })
    })
})


/*
broker.startTracking('BTCUSDT','1d','300');
broker.startTracking('BTCUSDT','1h','500');
broker.startTracking('BTCUSDT','15m','750');
broker.startTracking('BTCUSDT','1m','1000');

broker.startTracking('SOLUSDT','1d','300');
broker.startTracking('SOLUSDT','1h','500');
broker.startTracking('SOLUSDT','15m','750');
broker.startTracking('SOLUSDT','1m','1000');

broker.startTracking('MANAUSDT','1d','300');
broker.startTracking('MANAUSDT','1h','500');
broker.startTracking('MANAUSDT','15m','750');
broker.startTracking('MANAUSDT','1m','1000');
*/

const io = new Server({
    cors: {
        origin: [ /localhost/, /192\.168/, "http://192.168.1.10:8080" ],
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});
    
io.on("connection", (socket) => {
    console.log('client connected')

    socket.on("get_chart", (arg) => {
        let data = dataProcessor.getChart(arg);
        socket.emit("chart", data);
    });

    socket.on("list_tickers", (arg) => {
        let data = dataProcessor.getState();
        //console.log('SENDING_TICKERS: '+JSON.stringify(data))
        socket.emit("tickers", data);
    });

    socket.on("broker_my_trades", (arg) => {
        let data = broker.getMyTradesJSON();
        socket.emit('broker_my_trades', data);
    });


});

// server-side
//io.on("give", (socket) => {
//    socket.emit("data", data);
//});

io.listen(3005);