
function winRatio(win, loose)
{
    let ratio = 0;
    if (win > 0) { ratio = (win / (win+loose)) * 100; }
    return  ratio;
}

function orderStats(orders)
{
    let res = orders.reduce( (t, order) => { 
        t.gain += order.gain;
        if ( order.gain > 0 ) { t.win++ } else { t.lost++ };
        return t;
    }, { gain: 0, win: 0, lost: 0 });

    res.num = fOrders.length;
    res.ratio = ratio( res.win, res.lost );
    return res;
}

module.exports = { winRatio, orderStats };
