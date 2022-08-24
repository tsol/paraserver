
function winRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}

function entryStats(entries)
{
    let res = entries.reduce( (t, entry) => { 
        t.gp += entry.gainPercent;
        if ( entry.gainPercent > 0 ) { t.win++ } else { t.lost++ };
        return t;
    }, { gp: 0, win: 0, lost: 0 });

    res.num = entries.length;
    res.ratio = winRatio( res.win, res.lost );
    return res;
}

function fnum(num, digits){
    var pow = Math.pow(10, digits);
    return Math.round(num*pow) / pow;
}

function weekNum(dateObject) {
    
    startDate = new Date(dateObject.getFullYear(), 0, 1);
    var days = Math.floor((dateObject - startDate) /
        (24 * 60 * 60 * 1000));
          
    var weekNumber = Math.ceil(days / 7 + 1);
    
    return weekNumber;
}


module.exports = { winRatio, entryStats, fnum, weekNum };
