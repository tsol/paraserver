/* remove _example from filename, fill in your account data */

class SETTINGS {

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
        mysql: {
            host: "localhost",
            user: "yourusername",
            password: "yourpassword",
            database: "mydb"
        }
    };

    constructor() {
    };

};

module.exports = SETTINGS;