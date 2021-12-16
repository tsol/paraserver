const { Server } = require("socket.io");

const DataProcessor = require('./src/processors/DataProcessor.js');

const Broker = require('./src/brokers/binance/BinanceSource.js');

const broker = new Broker(
    {
        apiKey:     'q0xkezU4Pcp1VcTxIT8VrR5Z8Q81Clt40HA8NqFCFVdLnHMjiKoupOtQwogCnNgF',
        secretKey:  'nlcSYGg1VgGQFbxqm0FoYNdnwk3MZY5V4L0rl5VE4oWNtrGflDq6ohYd8JUwbqu6'
    }
);

const dataProcessor = new DataProcessor();

dataProcessor.addSymbol(broker,'BTCUSDT');



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
        let [symbol, timeframe] = arg.split('-');
        let data = dataProcessor.getTickerChart(symbol, timeframe);
        socket.emit("chart", data);
    });

    socket.on("list_tickers", (arg) => {
        let data = dataProcessor.getState();
        console.log('SENDING_TICKERS: '+JSON.stringify(data))
        socket.emit("tickers", data);
    });

    /*
    socket.on("broker_my_trades", (arg) => {
        let data = broker.getMyTradesJSON();
        socket.emit('broker_my_trades', data);
    });
*/

});

io.listen(3005);

