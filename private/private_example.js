/* remove _example from filename, fill in your account data */

class SETTINGS {

    // static dev = true;   /* developer mode */
    // static noCandleDebug = true;  /* do not add debug candles chart data and flag snaphots to orders */
    // static noFlagsSnapshot = true;

    static cors_origin = [ /localhost/, /192\.168/ ]; // allow websocket connect from 

    static users = {
            harry: {
                brokers: {
                    'binance': {
                        apiKey:     '* api key here *',
                        secretKey:  '* api secret key here *'
                    }
                }
            },
    };

    static databases = {
        mysqlCandles: {
            host: "localhost",
            user: "para",
            password: "password",
            database: "paracandles"
        },
        mysqlData: {
            host: "localhost",
            user: "para",
            password: "password",
            database: "paradata"
        }
    };

    constructor() {
    };

};

module.exports = SETTINGS;