# paraserver

## Description

This is the server part of the **PARAYOK** (Trading Helper Bot). For client part see [paraclient](https://github.com/tsol/paraclient). 

The main purpose of this software is to allow user to run different market strategies implemented as javascript modules, combine them, filter entry points, create an optimal trading plan - and then the system trades automaticly on any broker (currently only BINANCE-USDM implemented)

## Entry point - pserver3.js

Currently the set up of the server is done in pserver3.js file, which creates only one instance of user-worker (called vm).
So its one user mode at this stage. However the core supports any number of VMs to be created - so potensially serving many users
on single instance. All processor intensive operations are broked down into chunks to allow smooth loop operation.
In future some logic might be transfered to separate workers.

## GUI client - Server connection

Since the basic idea of the project is to deliver and process information as fast as possible in every direction -
in terms of communication it is entierly built on Sockets IO. Web Sockets are used here in order to recieve live updates from brokers - and
for the first iteration of the project - graphical interface (paraclient - vue) also uses websockets.


## Components OVERVIEW

### Business logic core module VM
VM.js represents a working environment with one Broker connection, a list of symbols, timeframes and strategies to be trades and also a user
defined trading plan (which is mostly an entries signal filter).

### Analyzers
Javascript modules dynamicly loaded upon VM creation providing Indicators and Strategies logic. Reside in /src/vm/Analyzers/list/

### Taggers
A list of modules providing Entries tagging for future conditional Entries filtering. Reside in /src/vm/Orders/taggers/

### Broker Interface
Connection to any broker is done by implementing 

## Booting up VM and business logic operation

When new VM object is being created - it goes the following loop:

1. CandleProxy object initialized to load candles from local DB cache and new ones from Broker (using REST - BrokersCandlesInterface)
2. A bunch of Ticker objects created - each corresponding to particular SYMBOL-TIMEFRAME pair, holding the state of all ANALYZERS.
3. AnalyzerFactory creates (dynamicly loads .js and initializes instances) a set of ANALYZERS for each Ticker.
4. Global FLAG storage is created (global flags state for each iteration).
5. CandleSequencer is initialized and run - its goal is to fetch and EXECUTE candles in orderly fashion (we always want higher timeframe candles to be processed first EVERY TIME, so that ANALYZERS can do their job)
6. CandleSequencer feeds candles by phases to OrderManager, which in turn runs all Tickers->analyzers against these new closed candles, generating updates to FLAGS object (for indicator) and new Entries (for strategies)
7. Once all history candles were processed Sequencer triggers switchLive() for ordersManager indicating that REAL BROKER ORDERS can take place now.
8. When a strategy fires up an Entry - new Entry object is added to emulated orders list.
10. If users filters (entryPlan) applies to this Entry - new Order is created and stored in Orders array.
11. If we are online (not loading up history candles) - the Order is being passed to RealOrders.js module, which operates real BROKER using APIs defined in BrokerAccount Interface.
12. All updates in broker state are passed to Telegram bot using HandleBrokerAccountEvents interface events.








