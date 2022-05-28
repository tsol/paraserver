class TH
{

    // locale string
    // old name: timestampToDate(timestamp)

    static timestampToDate(timestamp) { return this.ls(timestamp); };

    static ls(timestamp) {
        let od = new Date(timestamp);
        return od.toLocaleDateString('ru-RU')+' '+od.toLocaleTimeString('ru-RU');
    }
    
    // locale string time
    // old name: timestampTime(timestamp)
    static lst(timestamp) {
        let od = new Date(timestamp);
        return od.toLocaleTimeString('ru-RU');
    }
    
    // date object to mysql 
    static md(dateObject) {
        const now     = dateObject;
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

    // current date to mysql
    static mdc()
    {
        return this.mysqlFormat(new Date());
    }

    static currentTimestamp()
    {
        const date = new Date();
        return date.getTime();
    }

    static dateToTimestamp(dateString) {
        if (! dateString ) { return null; }
        const date = new Date(dateString);
        return date.getTime();
    }

    static timestampDaysBack(days) {
        var d = new Date();
        d.setDate(d.getDate() - days);
        d.setHours(0,0,0,0);
        return d.getTime();
    }

    static utcDaysBack(days) {
        var d = new Date();
        d.setDate(d.getUTCDate() - days);
        d.setUTCHours(0,0,0,0);
        return d.getTime();
    }

}

module.exports = TH;
