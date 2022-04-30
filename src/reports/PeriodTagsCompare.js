
const { TF } = require('../types/Timeframes.js');
const { winRatio, fnum } = require('../reports/helper.js');
//const Order = require('../types/Order.js');

class IntervalHour {

    size() { return TF.HOUR_LENGTH; }

    toStart( timestamp )
        { return this.size() * Math.floor( timestamp / this.size() ); }

    toEnd( timestamp )
        { return this.toStart(timestamp) + this.size() - 1; }

    display(timestamp) {
        return TF.timestampToDate( this.toStart(timestamp) ) +'-'+
        TF.timestampToDate( this.toEnd(timestamp) );
    }

    next( timestamp ) {
        return this.toEnd(timestamp) + 1;
    }

}

class IntervalDay extends IntervalHour {
    size() { return TF.DAY_LENGTH; }


    toStart (timestamp) {
        var date = new Date(timestamp),
            y = date.getFullYear(),
            m = date.getMonth(),
            d = date.getDate();

        var firstDay = new Date(y, m, d, 0, 0, 0, 0);
        return firstDay.getTime();
    }

    toEnd (timestamp) {
        var date = new Date(timestamp),
            y = date.getFullYear(),
            m = date.getMonth(),
            d = date.getDate();

        var lastDay = new Date(y, m, d, 23, 59, 59, 999);
        return lastDay.getTime();
    }

    next( timestamp ) {

        var date = new Date(timestamp),
            y = date.getFullYear(),
            m = date.getMonth(),
            d = date.getDate();

        var nextDay = new Date(y, m, d+1, 0, 0, 0, 0);
        return nextDay.getTime();
    }


}

class IntervalMonth extends IntervalHour {
    size() { throw new Exception('no size in month!'); };

    toStart (timestamp) {
        var date = new Date(timestamp), y = date.getFullYear(), m = date.getMonth();
        var firstDay = new Date(y, m, 1);
        return firstDay.getTime();
    }

    toEnd (timestamp) {
        var date = new Date(timestamp), y = date.getFullYear(), m = date.getMonth();
        var lastDay = new Date(y, m + 1, 0);
        return lastDay.getTime();
    }

    next( timestamp ) {
        var date = new Date(timestamp), y = date.getFullYear(), m = date.getMonth();
        var nextDay = new Date(y, m + 1, 1);
        return nextDay.getTime();
    }

}

class PeriodTagsCompare {

    static INTERVALS = Object.freeze({
        'h': new IntervalHour(),
        'd': new IntervalDay(),
        'm': new IntervalMonth()
    })

    constructor ()
    {
    }

    getReport(fromOrders, dateFrom, dateTo, interval, tag, tagValue, doEval)
    {
        const i = PeriodTagsCompare.INTERVALS[interval];
        if (! i) { throw new Error('unknown interval'); };

        let orders = fromOrders.sort( (a, b) => a.time - b.time );

        let startTime = i.toStart( dateFrom || orders[0].time );
        const endTime = i.toEnd( dateTo || (orders[ orders.length-1 ].time + 1) );
        
        orders = orders.filter( o => (o.time >= startTime) && (o.time <= endTime) );

        if (tag && tagValue) {
                orders = orders.filter( o => o.tags[tag] && (o.tags[tag].value == tagValue) );
        }
        else if  ( doEval ) {
            let func = new Function('o', 'return '+doEval+';');
            orders = orders.filter( o => func(o) );
        }

        if (orders.length <= 0) { return [ { periodName: 'No data' } ]; }            

        const rows = [];

        while (startTime < endTime) {
            let intervalEnd = i.toEnd(startTime);          
            let periodOrders = orders.filter( o => (o.time >= startTime) && (o.time <= intervalEnd ) );
            let res = this.calc ( periodOrders );
            res.periodName = i.display( startTime );
            res.src = tag+'='+tagValue+', '+interval;
            rows.push(res);
            startTime = i.next(startTime);
        }

        let res = this.calc( orders );
        res.periodName = 'TOTAL';
        res.src = tag+'='+tagValue+', '+interval;
        rows.push(res);

        return rows;
    }

    calc( orders ) {
        
        let maxOpenOrders = 0;
        let minGain = 0;
        let maxGain = 0;
        let gain = 0;
        let ratio = 0;
        let wins = 0;
        let losts = 0;
        let numOrders = 0;

        let openOrders = [];
        let i = 0;

        while ( i < orders.length ) {
            let o = orders[i];
            let currentTime = o.time;

            openOrders = openOrders.filter( o => o.closeTime > currentTime );

            openOrders.push(o);
            if (openOrders.length > maxOpenOrders)
                { maxOpenOrders = openOrders.length; }
            
            gain += o.gain;
            if (gain < minGain) {
                minGain = gain;
            }
            else if (gain > maxGain) {
                maxGain = gain;
            }

            if (o.gain > 0) { wins++; } else { losts++; };
            i++;
        }

        ratio = winRatio(wins,losts);
        numOrders = orders.length;

        return {
            maxOpenOrders,
            minGain: fnum(minGain,2),
            maxGain: fnum(maxGain,2),
            gain: fnum(gain,2),
            ratio: fnum(ratio,2),
            numOrders
        };

    }


}








module.exports = PeriodTagsCompare;