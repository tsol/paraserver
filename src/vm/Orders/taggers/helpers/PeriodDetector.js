const { weekNum } = require('../../../../reports/helper.js');

class PeriodDetector {

    constructor(params) {
    }
        

    reset() {
        this.previousHour = null;
        this.previousDay = null;
        this.previousMonth = null;
        this.previousWeek = null;
    }

    detect(newTimestamp)
    {
        const now = new Date(newTimestamp);

        const hour = now.getHours();
        const day = now.getDate();
        const month = now.getMonth();
        const week = weekNum(now);

        let res = {
            hour: null,
            day: null,
            month: null,
            week: null
        };

        if (this.previousHour !== hour) {
            this.previousHour = hour;
            res.hour = hour;
        }

        if (this.previousDay !== day) {
            this.previousDay = day;
            res.day = day;
        }

        if (this.previousMonth !== month) {
            this.previousMonth = month;
            res.month = month;
        }

        if (this.previousWeek !== week) {
            this.previousWeek = week;
            res.week = week;
        }

        return res;
    }


}

module.exports = PeriodDetector;

