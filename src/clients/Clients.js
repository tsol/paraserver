const WebClients = require("./WebClients.js");
const BotClients = require("./BotClients.js");

class Clients {

    constructor() {
        this.bot = new BotClients();
        this.web = new WebClients();
    }

    start(clientIO) {
        this.bot.start(clientIO);
        this.web.start(clientIO)
    }

    onNewRealOrder(order) {
        this.bot.onNewRealOrder(order);
    }

    onAccountUpdate(balance,pnl,positions) {
        this.bot.onAccountUpdate(balance,pnl,positions);
    }
  
}

module.exports = Clients;
