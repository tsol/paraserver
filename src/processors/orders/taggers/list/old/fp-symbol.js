/*
** Sets the flag which magic flag is better for a symbol (_F or _P)
** 
*/
const { TF } = require('../../../../../types/Timeframes.js');
const { winRatio } = require('../../../../../reports/helper.js');

class FP_SYMBOL {

    constructor(hours) {
        this.reset();
    }

    reset() {
        this.symbols = {};
    }

    hourlyTick(order,flags,orders,hour) {
        this.reset();
        
        const since = order.time - 24 * 14 * TF.HOUR_LENGTH+1;
    
        let fOrders = orders.filter( (o) => {
            return ( o.time > since ) && (! o.active );
        });

        fOrders.forEach( (order) => {
        
            let sym = this.symbols[ order.symbol ];
            if (! sym ) {
                sym = {
                    _F: { win: 0, lost: 0, gain: 0 },
                    _P: { win: 0, lost: 0, gain: 0 },
                    winner: 'N'
                };
                this.symbols[ order.symbol ] = sym;
            }

            let dst = sym[ order.tags.fp.value ];
            if (dst) {
                dst.gain += order.gain;
                if ( order.gain > 0 ) { dst.win++ } else { dst.lost++ };
            }
        
        });

        for(var symbolName in this.symbols) {
            let sym = this.symbols[ symbolName ];

            sym._F.ratio = winRatio(sym._F.win, sym._F.lost);
            sym._P.ratio = winRatio(sym._P.win, sym._P.lost);
            sym._F.num = sym._F.win + sym._F.lost;
            sym._P.num = sym._P.win + sym._P.lost;

            if ( sym._F.num + sym._P.num < 10 ) {
                sym.winner = 'N';
                continue;
            }            

            if ( 
                (sym._F.ratio > sym._P.ratio)
            &&  (sym._F.gain > sym._P.gain)
            &&  (sym._F.gain > 0)
//            &&  (sym._F.num > 0)
//            &&  (sym._F.gain / sym._F.num > 0.05)
            ) {
                sym.winner = '_F';
            }
            else
            if ( 
                (sym._P.ratio > sym._F.ratio)
            &&  (sym._P.gain > sym._F.gain)
            &&  (sym._P.gain > 0)
//            &&  (sym._P.num > 0)
//            &&  (sym._P.gain / sym._P.num > 0.05)
            ) {
                sym.winner = '_P';
            }
            else {
                sym.winner = 'N';
            }

        }

        //console.log('** HOURLY: '+hour);
        //console.log(this.symbols);


    }    
 
    getTags(order, flags, orders, tags) // return if order should pass
    {
        let res = 'N';

        const sym = this.symbols[ order.symbol ];

        if (sym && sym.winner == tags.fp.value) {
            res = 'Y';
        }

        const newTags = {
            FPS: { value: res }
        }

        return newTags;
    }

}


module.exports = FP_SYMBOL;

