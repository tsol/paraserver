const SETTINGS = require('../../private/private.js');
const TelegramBot = require('node-telegram-bot-api');

class BotClients {

    constructor() {
        this.chatIds = [];
        this.lastBalance = 0;
    }

    start(clientIO)
    {
        // Create a bot that uses 'polling' to fetch new updates
        const bot = new TelegramBot(SETTINGS.telebot.apiKey, {polling: true});
        
        this.bot = bot;
        this.clientIO = clientIO;

        bot.onText(/\/start/, (msg, match) => {
            const chatId = msg.chat.id;
        
            if ( this.chatIds.includes(chatId) ) {
                bot.sendMessage(chatId,'I allready know you :) Use /cancel to shut me up.');
                return;
            }
        
            this.chatIds.push(chatId);
            bot.sendMessage(chatId, 'Welcome! Now you will recieve updates! Use /cancel to shut me up.');
        
        });
                
                
        bot.onText(/\/cancel/, (msg, match) => {
            const chatId = msg.chat.id;
            
            if ( this.removeChatId(chatId)) {
                bot.sendMessage(chatId,'Your were unsubscribed!');
                return;
            }
        
            bot.sendMessage(chatId,'Your were NOT on the list! Use /start to subscribe.');
        
        });
        

        bot.onText(/\/account/, (msg, match) => {
            const chatId = msg.chat.id;
        
            clientIO.getAccountInformation().then( (res) => {
                const msg = this.renderAccountInfo(res.balance, res.pnl, res.positions);
                bot.sendMessage(chatId, msg);
            });

        });

        console.log('===> TELEGRAM BOT STARTED')
        
    }

    broadcast(message) {
        const opts = {
            parse_mode: 'HTML'
          };

/*
        const opts = {
            reply_markup:{
              keyboard: [
                ['FAQ'],
                ['Buy']
              ]
            },
            parse_mode: 'HTML'
          };
*/
        this.chatIds.forEach( id => this.bot.sendMessage(id, message, opts));
    }

    removeChatId(chatId) {
        const oldLen = this.chatIds.length;
        this.chatIds = this.chatIds.filter( id => id !== chatId );
        return this.chatIds.length !== oldLen;
    }

    /* =========== RENDER */

    renderAccountInfo(balance,pnl,positions) {

        let msg = '💸 '+Number(balance).toFixed(2)+' ['+Number(pnl).toFixed(2)+']\n'; 
        
        msg += positions.reduce( (msg, p) => {
            return msg + ' '+ (p.isLong ? '🍏' : '🍎')+' '+p.symbol+
            ' ['+Number(p.pnl).toFixed(2)+']\n';
        }, '')

        return msg;

    }

    /* =========== EVENTS */
 
    onNewRealOrder(order) {

        this.broadcast(
            (order.getIsLong() ? '🍏 Long' : '🍎 Short')+
            ' <b>'+order.getSymbol()+'</b> '+order.getEntryPrice()+
            '\n[💰 '+order.getTakeProfit()+' ⛔ '+order.getStopLoss()+']'+
            '\n('+order.getTimeframe()+', '+order.getStrategy()+')'
        );
    }

    onAccountUpdate(balance,pnl,positions) {
        if (Math.abs(balance-this.lastBalance) > 4.99) {
            let msg = this.renderAccountInfo(balance,pnl,positions); 
            this.broadcast(msg);
            this.lastBalance = balance;
        }
    }


}

module.exports = BotClients;
