class Timeframes
{
    TFRAMES = [
        { name: '1d',  limit:  300, length: 6 * 8 * 30 * 60000 },
        { name: '4h',  limit: 1000, length: 8 * 30 * 60000 },
        { name: '30m', limit: 1000, length: 30 * 60000 },
        { name: '5m',  limit: 1000, length: 5 * 60000 },
        { name: '1m',  limit: 1000, length: 60000 }
    ];

    next(timeframe) {
        // todo: use static definition in Timeframes
        switch (timeframe) {
            case '1m': return '30m';
            case '5m': return '4h';
            case '30m': return '4h';
            case '4h': return '1d';
        }
        return undefined;
    };


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
        return this.mysqlDatetime(null);
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

    timestampToDate(timestamp) {
        let od = new Date(timestamp);
        return od.toLocaleDateString('ru-RU')+' '+od.toLocaleTimeString('ru-RU');
    }

}

const TF = new Timeframes();

module.exports = { TF };
