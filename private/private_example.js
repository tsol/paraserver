/* remove _example from filename, fill in your data */

class SETTINGS {
  static vmid = 1; /* default project id under which all data will be stored */
  static dev = true; /* developer mode - no trading */

  // static notLive = true; /* never switch to live mode, only history candles */

  // static noCandleDebug = true;   /* do not add visualization to candles charts GUI */
  // static noFlagsSnapshot = true; /* do not add flag snaphots to orders (needed for GUI and tensorflow) */

  // if null - all symbols will be loaded from broker (bad idea for start)
  static debugSymbols = ['BTCUSDT', 'ETHUSDT'];
  static debugTimeframes = ['1d', '4h', '1h', '5m'];
  static debugDays = 31;

  //static debugFrom  = '2022-08-03 00:00:00'; // instead of debugDays can use range
  //static debugTo    = '2022-11-03 00:00:00'; // if end date specified - considered notLive

  // Analyzers to use in VM (both strategies and indicators)
  // (analyzer used in strategies will be loaded automatically using
  // dependency mechanism, however indicators required by TAGs
  // and GUI will not at the moment - thats why macdf and hl_trend is here)
  static debugStrategies = [
    'macdf',
    'hl_trend',
    'emac9',
    'emac21',
    'emac50',
    'emac100',
    'emac200',
    'magnets',
    'volrev',
    'ttcwoff',
  ];

  static cors_origin = [/localhost/, /192\.168/]; // allow websocket connect from

  static users = {
    trader: {
      brokers: {
        binance: {
          apiKey: '* api key here *',
          secretKey: '* api secret key here *',
        },
      },
    },
  };

  // This are default settings for entries filter
  // They can changed in GUI at runtime
  // based on those Entries are filtered into Orders

  static entryParams = {
    START_SUM: 190, // usd
    STAKE_MODE: 'fixed', // fixed, percent
    STAKE_PERCENT: 0.01, // stake = DEPOSIT * STAKE_PERCENT
    SIMULT_RISK_PERCENT: 0.2, // DEPOSIT * SIMULT_RISK = how many USD in risk in a moment
    STAKE_FIXED: 5, // in USD
    LEVERAGE: 20, // x Leverage
    COST_BUY_PERCENT: 0.0004, // 4 cents from every 100 dollars
    COST_SELL_PERCENT: 0.0004, // 0.04 % taker comission
    TAGS: { MRG: 'P' }, // { NYC: 'P', WRK: 'P', 'SAME-SYM': 'P', RSI: 'P', BT20: 'P' },
    SYMBOLS: ['BTCUSDT'], //['CHZUSDT', 'NEARUSDT', 'SOLUSDT', 'BNBUSDT', 'ETHUSDT', 'BTCUSDT'],
    STRATEGIES: null,
    TIMEFRAMES: ['4h', '1h'],
    JSCODE: `(o.getTagValue('MAXPRF')>=1.27)`,
  };

  static databases = {
    // candles considered somewhat temporary data, like a cache,
    // removing tables and database itself is not considered a problem
    // so we separate it from the main database
    mysqlCandles: {
      host: 'localhost',
      user: 'para',
      password: 'password',
      database: 'paracandles',
    },
    // main database, where all the precious data is stored
    mysqlData: {
      host: 'localhost',
      user: 'para',
      password: 'password',
      database: 'paradata',
    },
  };

  // bot will alert you when he enters a trade at real broker (use /start)
  // also will notify you on balance changes more than 5 usd
  // and you can ask him for balance with /account command
  static telebot = {
    apiKey: '*** your telegram bot api key here ***',
  };
}

module.exports = SETTINGS;
