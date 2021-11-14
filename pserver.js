const { Server } = require("socket.io");

const Broker = require('./src/brokers/binance/BrokerBinance.js');
const DataProcessor = require('./src/processors/DataProcessor.js');

const dataProcessor = new DataProcessor();

const broker = new Broker(
    {
        apiKey:     'Sx012YCUR2rFGGINH8N6CdT7tSRP0ATqxbxOGzpniI7pgHeb70sUGeXIuz1runwF',
        secretKey:  'iT2cDYfMOdU817kIcA2zFEUYMgM1KpuWx7eKf3o8gKFLs7f2YStFXfOSx6SxIg9c'
    },
    dataProcessor
);

broker.startTracking('BTCUSDT','5m','300');

const io = new Server({
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"],
        credentials: true
      },
    allowEIO3: true
});
    
io.on("connection", (socket) => {
    console.log('client connected')

    socket.on("give_data", (arg) => {
        console.log('sending data to client '+arg)
        let data = dataProcessor.getChart('BTCUSDT-5m');
        socket.emit("chart", data);
    });

});

// server-side
//io.on("give", (socket) => {
//    socket.emit("data", data);
//});

io.listen(3005);