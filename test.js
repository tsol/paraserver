
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

broker.startTracking('BTCUSDT','1m','10');




