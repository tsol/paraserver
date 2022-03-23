/* this is not standart client */

const { Spot } = require('@binance/connector')

class BinanceClient {

    constructor ({ apiKey, secretKey }, dataProcessor)
    {
        this.dataProcessor = dataProcessor;
        this.client = new Spot( apiKey, secretKey );        
        this.accountInfo = undefined;
        this.openOrders = [];
        this.myTrades = [];
    }

    getAccountInfo() { return this.accountInfo; }
    getOpenOrders() { return this.openOrders; }
    getMyTrades() { return this.myTrades; }

    async updateAccountInfo()
    {
        await this.client.account()
            .then(response => this.accountInfo = response.data )
            .catch(error => { throw new Error(error) } )
    } 

    async updateOpenOrders() {
        await this.client.openOrders()
            .then(response => this.openOrders = response.data )
            .catch(error => { throw new Error(error) } )
    }

    async updateMyTrades(toAsset) {

        if (this.accountInfo === undefined) {
            throw Error('account info is not ready to update trades')
        }
        
        this.myTrades = [];

        for (var balance of this.accountInfo.balances) {
            const asset = balance.asset;
            if (asset === toAsset) { continue; }

            const symbol = asset+toAsset;
            const sum = parseFloat(balance.free) + parseFloat(balance.locked);
            
            if (sum == 0) { continue; }
            
            console.log('request my_trades '+symbol);

            await this.client.myTrades(symbol).then(
                response => {
                    this.myTrades.push({
                        asset: asset,
                        symbol: symbol,
                        tradesHistory: response.data,
                        myAvgPrice: 0,
                        assetInfo: this.getMyAssetInfo(asset),
                        currentPrice: 0
                    });        
                }
            ).catch( error => { console.log(error) } );
            
        }

    }

    getMyAssetInfo(asset) {
        if (this.accountInfo === undefined) {
            return { free:0, locked: 0 };
        }
        const a = this.accountInfo.balances.filter( (b) => b.asset === asset );
        if (! a) {
            return { free:0, locked: 0 };
        }
        return a[0];
    }

    recalcAllMyTrades() {
        this.myTrades.forEach( (trade) => {
            const currentPrice = this.dataProcessor.getCurrentPrice(trade.symbol);
            if (! currentPrice) { 
                trade.currentPrice = 0;
                trade.myAvgPrice = 0;
            } else {
                trade.currentPrice = currentPrice;
                trade.myAvgPrice = this.calcMyAvgPrice(trade.tradesHistory);
            }
            trade.assetInfo = this.getMyAssetInfo(trade.asset);
        });
    }


    getMyTradesJSON()
    {
        this.recalcAllMyTrades();
        return this.myTrades;
    }

    calcMyAvgPrice(tradesHistory) {
    
        let totalUSDT = 0;
        let totalQTY = 0;

        tradesHistory.forEach( (t) => {

            if (t.isBuyer) {
                totalUSDT += parseFloat(t.quoteQty);
                totalQTY += parseFloat(t.qty);
            }
            else {
                totalUSDT -= parseFloat(t.quoteQty);
                totalQTY -= parseFloat(t.qty);
            }

        });

        if (totalQTY <= 0) {
            return 0;
        }

        if (totalUSDT < 1 ) {
            return 0;
        }

        return totalUSDT / totalQTY;
    }

 /*
    sendRawCoinInfo(socket) {
        this.client.coinInfo()
            .then(response => socket.emit('broker_coin_info', response.data) )
            .catch(error => socket.emit('error', error ) )
    }
   
    sendAllOrders(socket, symbol) {

        this.client.allOrders(symbol)
            .then(response => socket.emit(
                'broker_all_orders', { symbol: symbol, data: response.data } ))
            .catch(error => socket.emit('error', error ))
    }
*/

}

module.exports = BinanceClient;