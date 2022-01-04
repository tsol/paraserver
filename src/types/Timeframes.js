class Timeframes
{

    DAY_LENGTH = 6 * 8 * 30 * 60000;
    MIN_LENGTH = 60000;
    HOUR_LENGTH = this.MIN_LENGTH * 60;

    TFRAMES = [
        { name: '1d',  levelsLimit: 300, days: 300, limit: 0, levelsLimitTime: 0, length: this.DAY_LENGTH },
        { name: '4h',  levelsLimit: 500, days: 300,  limit: 0, levelsLimitTime: 0, length: 4 * this.HOUR_LENGTH },
        { name: '30m', levelsLimit: 500, days: 30,  limit: 0, levelsLimitTime: 0, length: 30 * this.MIN_LENGTH },
        { name: '5m',  levelsLimit: 500, days: 30,  limit: 0, levelsLimitTime: 0, length: 5 * this.MIN_LENGTH },
        { name: '1m',  levelsLimit: 500, days: 30,  limit: 0, levelsLimitTime: 0, length: this.MIN_LENGTH }
    ];

    constructor() {
        this.TFRAMES.forEach( (tf) => {
            tf.limit = Math.floor( (tf.days * this.DAY_LENGTH) / tf.length );
            tf.levelsLimitTime = tf.levelsLimit * tf.length;
            console.log('TF: tf limit set '+tf.name+' = '+tf.limit+' candles');
        });
    }


    next(timeframe) {
        // todo: use static definition in Timeframes
        switch (timeframe) {
            case '1m': return '5m';
            case '5m': return '30m';
            case '30m': return '4h';
            case '4h': return '1d';
        }
        return undefined;
    };

    get(timeframe) {
        return this.TFRAMES.find( t => t.name == timeframe );
    }

    getLevelLimitTime(timeframe) {
        return this.get(timeframe).levelsLimitTime;
    }

    getTimeframeLength(timeframe) {
        return this.get(timeframe).length;
    }


    /* REST of functions probably should be somewhere else :) */

    mysqlFormat(datetime) {
        var now     = new Date(datetime); 
        var year    = now.getFullYear();
        var month   = now.getMonth()+1; 
        var day     = now.getDate();
        var hour    = now.getHours();
        var minute  = now.getMinutes();
        var second  = now.getSeconds(); 
        if(month.toString().length == 1) {
             month = '0'+month;
        }
        if(day.toString().length == 1) {
             day = '0'+day;
        }   
        if(hour.toString().length == 1) {
             hour = '0'+hour;
        }
        if(minute.toString().length == 1) {
             minute = '0'+minute;
        }
        if(second.toString().length == 1) {
             second = '0'+second;
        }   
        var dateTime = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;   
        return dateTime;
    }


    currentDatetime()
    {
        return this.mysqlFormat(null);
    }

    currentTimestamp()
    {
        const date = new Date();
        return date.getTime();
    }

    dateToTimestamp(dateString) {
        if (! dateString ) { return null; }
        const date = new Date(dateString);
        return date.getTime();
    }

    timestampDaysBack(days) {
        var d = new Date();
        d.setDate(d.getDate() - days);
        d.setHours(0,0,0,0);
        return d.getTime();
    }

    timestampToDate(timestamp) {
        let od = new Date(timestamp);
        return od.toLocaleDateString('ru-RU')+' '+od.toLocaleTimeString('ru-RU');
    }

    getCandleTimeframeLength(candle) {
        return this.TFRAMES.find( tf => tf.name === candle.timeframe).length;
    }

    checkCandleShorter(candle) {
        return (candle.openTime + this.getCandleTimeframeLength(candle) >= candle.closeTime-1);
    }

    checkCandleCloseTimeInFuture(candle) {
        return (candle.closeTime > this.currentTimestamp());
    }

}

const TF = new Timeframes();

module.exports = { TF };
