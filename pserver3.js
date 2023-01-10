const SETTINGS = require('./private/private.js');

const BinanceUSDMCandles = require('./src/brokers/binance/BinanceUSDMCandles.js');
const BinanceUSDMUser = require('./src/brokers/binance/BinanceUSDMUser.js');

const MysqlCandles = require('./src/db/mysql/MysqlCandles.js');
const CandleProxy = require('./src/db/CandleProxy.js');

const MysqlProvider = require('./src/db/mysql/MysqlProvider.js');
const DBAccessFactory = require('./src/db/DBAccessFactory.js');

const VMClientView = require('./src/vm/VMClientView.js');

const TH = require('./src/helpers/time');
const VM = require('./src/vm/VM.js');
const ClientsEventHandler = require('./src/clients/ClientsEventHandler.js');

const brokerCandles = new BinanceUSDMCandles(
  SETTINGS.users.harry.brokers.binance
);
const brokerUser = new BinanceUSDMUser(SETTINGS.users.harry.brokers.binance);
const dbCandles = new MysqlCandles();
const dbAccessFactory = new DBAccessFactory(new MysqlProvider());

dbAccessFactory.connect(SETTINGS.databases.mysqlData).then(() => {
  dbCandles.connect(SETTINGS.databases.mysqlCandles).then(() => {
    brokerCandles.init().then(() => {
      brokerUser.init().then(() => {
        const candleProxy = new CandleProxy(dbCandles, brokerCandles);

        const clients = new ClientsEventHandler();

        const vm = new VM(1, dbAccessFactory, candleProxy, brokerUser, clients);

        clients.start(new VMClientView(vm));

        // ['BTCUSDT','ETHUSDT','ANCUSDT','LUNAUSDT','WAVESUSDT','ARUSDT','ATOMUSDT','UNIUSDT','FILUSDT','AVAXUSDT','SOLUSDT','SRMUSDT', 'ZRXUSDT'];

        let symbols = null;
        let timeframes = ['1h'];
        let strategies = [];
        let fromTime = TH.utcDaysBack(92);
        let toTime = null;

        if (SETTINGS.debugSymbols) {
          symbols = SETTINGS.debugSymbols;
        }
        if (SETTINGS.debugTimeframes) {
          timeframes = SETTINGS.debugTimeframes;
        }
        if (SETTINGS.debugStrategies) {
          strategies = SETTINGS.debugStrategies;
        }
        if (SETTINGS.debugFrom) {
          fromTime = TH.dateToTimestamp(SETTINGS.debugFrom);
        }
        if (SETTINGS.debugTo) {
          toTime = TH.dateToTimestamp(SETTINGS.debugTo);
        }

        if (SETTINGS.debugDays) {
          fromTime = TH.utcDaysBack(SETTINGS.debugDays);
        }

        if (SETTINGS.notLive) {
          toTime = new Date().getTime();
        }

        brokerCandles.getTradableSymbols().then((allSymbols) => {
          if (!symbols) {
            symbols = allSymbols;
          }

          symbols = symbols.filter((c) => c !== 'BTCUSDT');
          symbols.unshift('BTCUSDT');

          vm.init(symbols, timeframes, strategies, fromTime, toTime, {}).then(
            () => {
              console.log('VM initialized');
            }
          );
        });
      });
    });
  });
});
