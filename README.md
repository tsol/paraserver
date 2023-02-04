# paraserver

## Description

This is the server part of the **PARAYOK** (Trading Laboratory and Bot). For client part see [paraclient](https://github.com/tsol/paraclient).

The main purpose of this software is to allow user to run different market strategies implemented as javascript modules, combine them, filter entry points, create an optimal trading plan - and then the system trades automaticly on any broker (currently only BINANCE-USDM implemented).

System desing of PARAYOK is based upon specifically not distinguishing history emulation from realtime trading. You specify starting date - the server
loads up candles from local cache, missing candles from the broker and starts processing them in order. Once all candles are processed (and
system is setup to go live) it goes live and from this moment all entries (filtered out by entryPlan filter) go to a real broker as well as
to local state.

Unlike trading view's Pine script system - PARAYOK is not heavily bound to a single SYMBOL while executing strategies, but rather handles everything in
bulk. You can run any number of strategies on any number of SYMBOLS on any number of timeframes simultaniously. Then you use filtering to allow only best of the generated entries to become Orders. You can either explore and create such meta-strategies or execute them on live broker all with same interface and same instances by a click of a mouse (and some hardcore console work at the moment :)

### Latest news: tensorflow.js

Tightly involved in adding **tensorflow.js** based entries tagging. Already implemented command line tool to create / train and hyper-optimize models.
Don't want do give myself false hopes, but allready using simple ANN network with just bunch of EMAs, RSI and Level weights it gives up to 5% increase in win/loose ratio in some circumstances.

And thats just basic ANN based primaraly on EMA's. Next step is ANN model taking relative candle and volume changes, and also a convolutional
network to process relative candle images, along with nearest levels of interest rendered to the picture.

It's not ready to use yet - there is no tagger to include model predictions in the bot, im just working on infrastructure and proof-of-concept.

## Setup

1. Download, install dependencies
2. Copy /private/private_example.js to /private/private.js - this is the main config
3. Create two empty databases in mysql (one for candles cache, one for essential data)
4. fill in private.js file with

- database information
- binance account api
- telegram bot api

5. run the server
6. download and install gui client, configure it and use to control server
7. create new indicators and strategies (entry point generators) in /src/vn/Analyzers/list folder
8. create and include/exclude entry TAGGERs in /src/vm/Orders/taggers folder

## Entry point - pserver3.js

Currently the set up of the server is done in pserver3.js file, which creates only one instance of user-worker (called vm).
So its one user mode at this stage. However the core supports any number of VMs to be created - so potentially serving many users
on single instance. All processor intensive operations are broked down into chunks to allow smooth loop operation.
In future some logic might be transfered to separate workers.

## GUI client - Server connection

Since the basic idea of the project is to deliver and process information as fast as possible in every direction -
in terms of communication it is entierly built on Sockets IO. Web Sockets are used here in order to recieve live updates from brokers - and
for the first iteration of the project - graphical interface (paraclient - vue) also uses websockets.

## Components OVERVIEW

### Business logic core module VM

VM.js represents a working environment with one Broker connection, a list of symbols, timeframes and strategies to be trades and also a user
defined trading plan (which is mostly an entries filter).

### Analyzers

Analyzers are javascript modules dynamicly loaded upon VM creation providing Indicators and Strategies. Reside in /src/vm/Analyzers/list/
This is the core trading logic. Indicators update FLAGs state at every closed candle received (live or history), strategies create Entries based on those flags.

And then taggers use FLAGS and current active entries/account state to assign tags to each entry.

### Taggers

A list of modules providing Entries tagging for future conditional Entries filtering. Reside in /src/vm/Orders/taggers/

Taggers are the way to create additional evaluation parameters for each raw Entry,
which are then used to filter out the best Entry points and allow them
to became Orders and then Real Broker Orders.

This design transfers control over entry conditions outside of strategies to external
actors (user GUI and neural network).

In terms of GUI it allows more flexible and interactive way of filtering out entry conditions by combining different tags, current balance state and other strategies state
to create a meta-strategy consistent with users risk and expectations.

In terms of neural network - TAGs can (and must) be used as inputs for a model. The number
of samples is crucial in ML, so transfering entry condition to tags in that aspect is
also the best solution.

So, long story short, use strategies to find as many entry points as possible.
Ideally a good strategy must contain only core entry conditions specific for that strategy
(as well as initial stopLoss and takeProfit setup logic).

Move maxium conditions out of strategies into tags, especially if they look more or less
universal. Use entryPlan configuration and GUI to filter out good entries from bad.

### Broker Interface

Connection to any broker is done by implementing BrokerAccountInterface and BrokerCandlesInterface Interfaces. Currently only BINANCE implemented.

### Data storage

Data storage is used to store massive amount of Candles data, user settings and results of candle processing through VM. To implement data storage you need to implement DBCandlesInterface and DBProviderInterface (later Candles interface will be removed in favor of DBProviderInterface approach).

### CandleProxy

Is a caching proxy between candle users in application and the broker. It stores candles in DB and fetches only missing candles from BrokerCandleInterface object.

### CandleSequencer

Is an ordering tool which takes in sequential array of candles (either form storage or newly arrived), joins them into bunches, waits for
every candle expected at current iteration (phase) to arrive and then passes them to CandleProcessor in correct order (higher timeframes go first,
BITCOIN comes before other pairs, etc).

## Booting up VM and business logic operation

When new VM object is being created - it goes the following loop:

1. CandleProxy object initialized to load candles from local DB cache and new ones from Broker (using REST - BrokersCandlesInterface)
2. A bunch of Ticker objects created - each corresponding to particular SYMBOL-TIMEFRAME pair, holding the state of all ANALYZERS.
3. AnalyzerFactory creates (dynamicly loads .js and initializes instances) a set of ANALYZERS for each Ticker.
4. Global FLAG storage is created (global flags state for each iteration).
5. CandleSequencer is initialized and run - its goal is to fetch and EXECUTE candles in orderly fashion (we always want higher timeframe candles to be processed first EVERY TIME, so that ANALYZERS can do their job)
6. CandleSequencer feeds candles by phases to CandleProcessor, which in turn runs all Tickers->analyzers against these new closed candles, generating updates to FLAGS object (indicators) and new Entries (strategies) to OrdersManager class.
7. Once all history candles were processed Sequencer triggers switchLive() for ordersManager indicating that REAL BROKER ORDERS can take place now.
8. When a strategy fires up an Entry - new Entry object is added to emulated orders list (OrderManager).
9. If users filters (entryPlan) applies to this Entry - new Order is created and stored in Orders array (entryPlan).
10. If we are online (not loading up history candles) - the Order is being passed to RealOrders.js module, which operates real BROKER using APIs defined in BrokerAccount Interface.
11. All updates in broker state are passed to Telegram bot using HandleBrokerAccountEvents interface events.

## TODO

1. Store Cache for orders (like CandleDebug)

- fixed flag / function for cached entities

2. Global State store for every Analyzer / Tag

- store state to db every N pulses in history mode, every phaseEnd when live
  (crash safe/continue)

3. Allow live adding / removing of SYMBOL/TIMEFRAME/STRATEGY to VM ?

- Split candle debug to different symbol-timeframe-strategy DB entries
- Remove BTC dependent TAGS/FLAGS ? Or leave as dependancy?
- When higher timeframes needed by strategy/indicator add dependency ?

=

Lots of stuff todo, however we are on a verge of total refactoring of order management (see TOrdersManager mockup file).
Most of stuff starting from Ticker->addCandle should be remade.

Possibly its time to convert everything to Typescript and ES modules.

But the main problem is to solve order flow to make it more clean and sane and allowing whole system to implement partial orders closure and trailing stops without ugly workarounds!
