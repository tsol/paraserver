
const Order = require('./Order.js');

class OrderReal extends Order {

  constructor( entryObj, quantity, brokerORID, brokerSLID, brokerTPID )
  {
      super(entryObj, quantity);

      this.brokerORID = brokerORID;
      this.brokerSLID = brokerSLID;
      this.brokerTPID = brokerTPID;

  }

}

module.exports = OrderReal;