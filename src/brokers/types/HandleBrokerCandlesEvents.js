/*
 ** This is what BrokerSource subscribers must do.
 **
 ** If you subscribe to symbol+timeframe using source->subscribe function
 ** you must implement this
 */

class HandleBrokerCandlesEvents {
  newCandleFromBroker(candle, eventTime) {}
}

module.exports = HandleBrokerCandlesEvents;
