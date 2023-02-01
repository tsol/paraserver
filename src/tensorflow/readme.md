### Tensorflow integration laboratory

run.mjs - your command line tool.
t folder - proposed place for model setup files

## setup files

Setup files contain instructions and methods to

- what structure of model to create (build object)
- what data to use for training and verification (getData method)
- how to optimize hyperparameters (optimize object)

## workflow

Entry points for model training are strategy entires because the purpose
of the model is to be used as an ordinary TAG to a strategy upon which
you (or bot) can later filter out doubtfull entries.

So to get data you must first create an VM instance (using main sever
config /private/private.js) and run the VM in order to create database
entries for Entries (market entries) as well as let server to load
candles.

1.  Set up system settings file, if you havent already - specify database
    settings (both for candles cache and entities), specify broker API's for candles
    and account management (!!! make sure to set dev to true to prevent server from
    actually trading), specify a VM id (later it will be used in model setup configs
    as a source of data).

- select time period for which the VM should be executed (say 365 days)
- select symbols, timeframes and strategies for the VM
- we dont care about entry plan params, we gonna use raw unfiltered Entries

Run the server, wait for it to load all candles and create Entries.
Once 'VM initialized' appears on the console and MYSQL stops saving data -
you good to go. Connect using GUI to check that the VM is created and
Entries are there.

2. At this point you will have paracandles database filled with candle data,
   and paradata database has orders_1 table created and filled (where 1 is VM id)
   You can start training and optimizing models.

3. in t subfolder of tensorflow folder create your model, choose data, parameters,
   inputs, layers and use run.mjs tool on this file.

P.S. If you have nvidea card you might switch to tfjs-node-gpu. If not - you might
also try switching to tfjs-node. In my case plain tfjs works fastest.

P.S.2.
There is no way to save models and use them (no tagger created) so it's just
theoretical work now
