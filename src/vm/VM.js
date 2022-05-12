/* 
** VM object, containing one virtual trading bot system.
**
** Constructor requires:
**
** 1. BrokerSrc object to subscribe to live updates
** 2. CandleProxy cache to load candles from broker
** 3. BrokerOrders to place orders and take wallet information
** 4. Array of SYMBOLS to run
** 5. Array of Timeframes to run
** 6. Period to run
** 7. Live or Simulation switch (when live - only fromDate specified)
** 8. Array of Stategies to run (names)
** 9. Function to use as order filter (later will be array of arrays of conditions)
** 10. Configuration options for strategies and other analyzers
** 11. UserIO class to report updates to
**
**
*/

class VM {

    constructor() {
    }



 
}

module.exports = VM;
