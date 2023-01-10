const WebClients = require('./WebClients.js');
const BotClients = require('./BotClients.js');

class ClientsEventHandler {
  constructor() {
    this.bot = new BotClients();
    this.web = new WebClients();
  }

  start(vmClientsView) {
    this.bot.start(vmClientsView);
    this.web.start(vmClientsView);
  }

  onNewRealOrder(order) {
    this.bot.onNewRealOrder(order);
  }

  onAccountUpdate(balance, pnl, positions) {
    this.bot.onAccountUpdate(balance, pnl, positions);
  }
}

module.exports = ClientsEventHandler;
