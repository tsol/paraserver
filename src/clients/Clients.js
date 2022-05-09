//const SETTINGS = require('../../private/private.js');
const { Server } = require("socket.io");
const WebClients = require("./WebClients.js");
const BotClients = require("./BotClients.js");

class Clients {

    constructor() {
        this.bot = new BotClients();
        this.web = new WebClients();
    }

    start(dataProcessor) {
        this.bot.start(dataProcessor);
        this.web.start(dataProcessor)
    }

    onNewRealOrder(order) {
        this.bot.onNewRealOrder(order);
    }

    onAccountUpdate(balance,pnl,positions) {
        this.bot.onAccountUpdate(balance,pnl,positions);
    }
  
}

module.exports = Clients;
