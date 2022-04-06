/*
    CUSTOM strategies filter
*/

const ALLOWED_APR = [
    'WAVESUSDT-macwfma',
    'DEFIUSDT-tpcwfma',
    'CELOUSDT-macwfma',
    'TRBUSDT-macwfma',
    'YFIIUSDT-tpcwfma',
    'THETAUSDT-tpcwfma',
    'ANCUSDT-macwfma',
    'UNFIUSDT-macwfma',
    'RENUSDT-tpcwfma',
    'BATUSDT-tpcwfma',
    'RSRUSDT-tpcwfma',
    'ONEUSDT-macwfma',
    'AXSUSDT-tpcwfma',
    'ROSEUSDT-tpcwfma',
    'HBARUSDT-tpcwfma',
    'ARUSDT-tpcwfma',
    'WAVESUSDT-tpcwfma',
    'ARPAUSDT-tpcwfma',
    'BATUSDT-macwfma',
    'ENJUSDT-tpcwfma',
    'API3USDT-tpcwfma',
    'ALPHAUSDT-tpcwfma',
    'BTSUSDT-tpcwfma',
    'IOTAUSDT-tpcwfma',
    'CTSIUSDT-tpcwfma',
    'LPTUSDT-tpcwfma',
    'VETUSDT-tpcwfma',
    'FLOWUSDT-tpcwfma',
    'FTMUSDT-macwfma',
    'CRVUSDT-macwfma',
    'SRMUSDT-macwfma',
    '1000XECUSDT-tpcwfma',
    'LRCUSDT-tpcwfma',
    'RVNUSDT-tpcwfma',
    'BTSUSDT-macwfma',
    'DASHUSDT-tpcwfma',
    'NKNUSDT-tpcwfma',
    'ROSEUSDT-macwfma',
    'SKLUSDT-tpcwfma',
    'ANKRUSDT-tpcwfma',
    'SCUSDT-tpcwfma',
    'NEOUSDT-tpcwfma',
    'VETUSDT-macwfma',
    'SXPUSDT-macwfma',
    'SRMUSDT-tpcwfma',
    'ARUSDT-macwfma',
    'HOTUSDT-macwfma',
    '1000BTTCUSDT-macwfma',
    'LPTUSDT-macwfma',
    '1INCHUSDT-tpcwfma',
    'BCHUSDT-tpcwfma',
    'MKRUSDT-macwfma',
    'ETHUSDT-tpcwfma',
    'MATICUSDT-tpcwfma',
    'GMTUSDT-macwfma',
    'APEUSDT-macwfma',
    'DOTUSDT-tpcwfma',
    'XEMUSDT-tpcwfma',
    'IOTAUSDT-macwfma',
    'HOTUSDT-tpcwfma',
    'BNBUSDT-tpcwfma',
    'LITUSDT-tpcwfma',
    'CVCUSDT-macwfma',
    'ZECUSDT-macwfma',
    'COTIUSDT-tpcwfma',
    'ONTUSDT-tpcwfma',
    'TOMOUSDT-tpcwfma',
    'CELOUSDT-tpcwfma',
    'AKROUSDT-macwfma',
    'NEARUSDT-macwfma',
    'LINKUSDT-tpcwfma',
    'BAKEUSDT-macwfma',
    'TRXUSDT-tpcwfma',
    'RUNEUSDT-macwfma',
    'AUDIOUSDT-tpcwfma',
];


const TILL_2202_ALL = [
'WAVESUSDTdblbottom',
'KAVAUSDT-dblbottom',
'DEFIUSDT-dblbottom',
'FLMUSDT-cma3buy',
'RVNUSDT-dblbottom',
'REEFUSDT-cma3buy',
'FILUSDT-macwfma',
'FTMUSDT-dblbottom',
'BELUSDT-dblbottom',
'AXSUSDT-dblbottom',
'FLOWUSDT-macwfma',
'RUNEUSDT-dblbottom',
'ANTUSDT-macwfma',
'SFPUSDT-dblbottom',
'XTZUSDT-dblbottom',
'ADAUSDT-cma3buy',
'CVCUSDT-cma3buy',
'EGLDUSDT-tpcwfma',
'ALPHAUSDT-cma3buy',
'DUSKUSDT-tpcwfma',
'RLCUSDT-cma3buy',
'HOTUSDT-macwfma',
'ZRXUSDT-dblbottom',
'EGLDUSDT-macwfma',
'STORJUSDT-cma3buy',
'SCUSDT-tpcwfma',
'SNXUSDT-tpcwfma',
'ONTUSDT-tpcwfma',
'DYDXUSDT-cma3buy',
'HNTUSDT-cma3buy',
'BTCUSDT-tpcwfma',
'ICXUSDT-tpcwfma',
'ONEUSDT-dblbottom',
'LITUSDT-cma3buy',
'IOTAUSDT-cma3buy',
'DGBUSDT-macwfma',
'BTCUSDT-cma3buy',
'RUNEUSDT-macwfma',
'ZILUSDT-macwfma',
'XTZUSDT-cma3buy',
'SRMUSDT-dblbottom',
'SRMUSDT-cma3buy',
'ROSEUSDT-macwfma',
'STMXUSDT-cma3buy',
'NEARUSDT-cma3buy',
'BELUSDT-cma3buy',
'FILUSDT-cma3buy',
'XRPUSDT-cma3buy',
'STORJUSDT-tpcwfma',
'DGBUSDT-tpcwfma',
'BAKEUSDT-cma3buy',
'ETHUSDT-macwfma',
'CELRUSDT-cma3buy',
'OMGUSDT-tpcwfma',
'AXSUSDT-cma3buy',
'ATAUSDT-cma3buy',
'ZILUSDT-cma3buy',
'ZRXUSDT-tpcwfma',
'WAVESUSDT-cma3buy',
'ETHUSDT-tpcwfma',
'OCEANUSDT-cma3buy',
'ONTUSDT-cma3buy',
'RLCUSDT-tpcwfma',
'ARUSDT-tpcwfma',
'UNFIUSDT-cma3buy',
'DOGEUSDT-cma3buy',
'GTCUSDT-cma3buy',
'XMRUSDT-cma3buy',
'OMGUSDT-cma3buy',
'COTIUSDT-macwfma',
'BTSUSDT-cma3buy',
'LINKUSDT-tpcwfma',
'ENJUSDT-tpcwfma',
'BALUSDT-tpcwfma',
'DGBUSDT-cma3buy',
'YFIIUSDT-cma3buy',
'SUSHIUSDT-tpcwfma',
'RAYUSDT-tpcwfma',
'ANKRUSDT-cma3buy',
'SRMUSDT-tpcwfma',
'ZENUSDT-cma3buy',
'AUDIOUSDT-cma3buy',
'CTSIUSDT-tpcwfma',
'IOTAUSDT-tpcwfma',
'RUNEUSDT-tpcwfma',
'DOGEUSDT-tpcwfma',
'1000SHIBUSDT-tpcwfma',
'ZECUSDT-cma3buy',
'DUSKUSDT-macwfma',
'IOTXUSDT-tpcwfma',
'TRBUSDT-cma3buy',
'OGNUSDT-macwfma',
'RUNEUSDT-cma3buy',
'VETUSDT-macwfma',
'RAYUSDT-cma3buy',
'CHRUSDT-cma3buy',
'MATICUSDT-cma3buy',
'HOTUSDT-tpcwfma',
'AVAXUSDT-macwfma',
'BATUSDT-macwfma',
'LPTUSDT-tpcwfma',
'OGNUSDT-cma3buy',
'RLCUSDT-macwfma',
'BAKEUSDT-tpcwfma',
'AVAXUSDT-cma3buy',
'VETUSDT-tpcwfma',
'BALUSDT-macwfma',
'PEOPLEUSDT-macwfma',
'ICPUSDT-tpcwfma',
'SOLUSDT-cma3buy',
'GALAUSDT-macwfma',
'SANDUSDT-cma3buy',
'IOTXUSDT-cma3buy',
'RSRUSDT-tpcwfma',
'STMXUSDT-tpcwfma',
'SANDUSDT-tpcwfma',
'SFPUSDT-cma3buy',
'XEMUSDT-tpcwfma',
'AXSUSDT-macwfma',
'RENUSDT-macwfma',
'QTUMUSDT-macwfma',
'OGNUSDT-tpcwfma',
'1000SHIBUSDT-macwfma',
'LRCUSDT-macwfma',
'DOGEUSDT-macwfma',
];


const TILL_2202_M4 = [
    'ENJUSDTmacwfma',
    'ADAUSDT-cma3buy',
    'CELRUSDT-tpcwfma',
    'CHZUSDT-cma3buy',
    'ATOMUSDT-macwfma',
    'UNIUSDT-macwfma',
    'RSRUSDT-tpcwfma',
    'BATUSDT-tpcwfma',
    'BATUSDT-macwfma',
    'ETCUSDT-tpcwfma',
    'LTCUSDT-macwfma',
    'ETHUSDT-tpcwfma',
    'CRVUSDT-macwfma',
    'XEMUSDT-tpcwfma',
    'ALPHAUSDT-macwfma',
    'FLMUSDT-tpcwfma',
    'CRVUSDT-tpcwfma',
    '1000SHIBUSDT-macwfma',
    'STORJUSDT-macwfma',
    'LRCUSDT-macwfma',
    'ALGOUSDT-macwfma',
    'BCHUSDT-tpcwfma',
    'OCEANUSDT-macwfma',
    'SNXUSDT-tpcwfma',
    'XMRUSDT-macwfma',
    'DENTUSDT-macwfma',
    'C98USDT-macwfma',
    'CTSIUSDT-tpcwfma',
    'SANDUSDT-tpcwfma',
    'REEFUSDT-macwfma',
    'TLMUSDT-macwfma',
    'QTUMUSDT-macwfma',
    'RSRUSDT-macwfma',
    'TRBUSDT-tpcwfma',
    'SXPUSDT-cma3buy',
    'TOMOUSDT-cma3buy',
    'REEFUSDT-cma3buy',
    'ANKRUSDT-cma3buy',
    'DUSKUSDT-tpcwfma',
    'LITUSDT-tpcwfma',
    'FLMUSDT-macwfma',
    'LPTUSDT-tpcwfma',
    'ARUSDT-tpcwfma',
    'STMXUSDT-macwfma',
    'GRTUSDT-macwfma',
    'STMXUSDT-tpcwfma',
    'ONTUSDT-tpcwfma',
    'VETUSDT-cma3buy',
    'AVAXUSDT-tpcwfma',
    'IOTXUSDT-macwfma',
    'DOGEUSDT-macwfma',
    'SFPUSDT-tpcwfma',
    'ROSEUSDT-macwfma',
    'COTIUSDT-macwfma',
    'LINKUSDT-tpcwfma',
    'OCEANUSDT-tpcwfma',
    'CELRUSDT-macwfma',
    'CHZUSDT-macwfma',
    'SOLUSDT-macwfma',
    'SCUSDT-tpcwfma',
    'DASHUSDT-macwfma',
    'RAYUSDT-tpcwfma',
    'BCHUSDT-macwfma',
    'LINAUSDT-macwfma',
    'OGNUSDT-tpcwfma',
    'ALICEUSDT-tpcwfma',
    'SCUSDT-cma3buy',
    'DGBUSDT-macwfma',
    'RLCUSDT-tpcwfma',
    'ANTUSDT-macwfma',
    'XRPUSDT-macwfma',
    'DGBUSDT-tpcwfma',
    'BTSUSDT-tpcwfma',
    'STORJUSDT-tpcwfma',
    'MASKUSDT-tpcwfma',
    'BALUSDT-cma3buy',
    'DYDXUSDT-cma3buy',
    'ICXUSDT-tpcwfma',
    'VETUSDT-macwfma',
    'GALAUSDT-macwfma',
    'TRBUSDT-macwfma',
    'ICPUSDT-cma3buy',
    'SUSHIUSDT-macwfma',
    'IOTXUSDT-tpcwfma',
    'BALUSDT-macwfma',
    'RUNEUSDT-macwfma',
    'UNIUSDT-cma3buy',
    'FILUSDT-macwfma',
    'DEFIUSDT-cma3buy',
    'OGNUSDT-cma3buy',
    'EGLDUSDT-macwfma',
    'RENUSDT-macwfma',
    'ADAUSDT-macwfma',
    'AUDIOUSDT-macwfma',
    'ENSUSDT-cma3buy',
    'PEOPLEUSDT-macwfma',
    'SRMUSDT-macwfma',
    'AAVEUSDT-tpcwfma',
    'GTCUSDT-tpcwfma',
    'OMGUSDT-macwfma',
    'RUNEUSDT-cma3buy',
    'SRMUSDT-cma3buy',
    'SNXUSDT-cma3buy',
    'ATAUSDT-cma3buy',
    'AVAXUSDT-macwfma',
    'DUSKUSDT-macwfma',
    'SRMUSDT-tpcwfma',
    'CTSIUSDT-dblbottom',
    'ANTUSDT-cma3buy',
    'FLOWUSDT-macwfma',
    'ALPHAUSDT-cma3buy',
    'ZENUSDT-cma3buy',
    'AVAXUSDT-cma3buy',
    'TRXUSDT-cma3buy',
    'FLMUSDT-cma3buy',
    'ZRXUSDT-cma3buy',
    'OMGUSDT-cma3buy',
    'NEARUSDT-cma3buy',
    'SOLUSDT-cma3buy',
    'MATICUSDT-cma3buy',
    'XMRUSDT-cma3buy',
    'LINAUSDT-cma3buy',
    'SFPUSDT-cma3buy',
    'YFIIUSDT-cma3buy',
    'KSMUSDT-cma3buy',
    'STORJUSDT-cma3buy',
    'BTCUSDT-cma3buy',
    'UNFIUSDT-cma3buy',
    'SANDUSDT-cma3buy',
    'IOTXUSDT-dblbottom',
    'RVNUSDT-dblbottom',
    'BANDUSDT-cma3buy',
    'NKNUSDT-cma3buy',
    'CHRUSDT-cma3buy',
    'CRVUSDT-cma3buy',
    'C98USDT-cma3buy',
    'DGBUSDT-cma3buy',
    'GTCUSDT-cma3buy',
    'MKRUSDT-cma3buy',
    'RAYUSDT-cma3buy',
    'ZECUSDT-cma3buy',
    'LTCUSDT-cma3buy',
    'QTUMUSDT-cma3buy',
    'IOTXUSDT-cma3buy',
    'BLZUSDT-dblbottom',
    'ARUSDT-dblbottom',
    'WAVESUSDT-dblbottom',
    'XTZUSDT-dblbottom',    
];


const TILL_2202_G = [
'DUSKUSDT-macwfma',
'DUSKUSDT-tpcwfma',
'ROSEUSDT-macwfma',
'ANTUSDT-macwfma',
'PEOPLEUSDT-macwfma',
'LPTUSDT-tpcwfma',
'ARUSDT-tpcwfma',
'BAKEUSDT-tpcwfma',
'1000SHIBUSDT-macwfma',
'DGBUSDT-macwfma',
'DGBUSDT-tpcwfma',
'DOGEUSDT-macwfma',
'ETHUSDT-macwfma',
'STMXUSDT-tpcwfma',
'AVAXUSDT-macwfma',
'BALUSDT-macwfma',
'QTUMUSDT-macwfma',
'RENUSDT-macwfma',
'OGNUSDT-tpcwfma',
'ONTUSDT-tpcwfma',
'XEMUSDT-tpcwfma',
'SRMUSDT-tpcwfma',
'ICXUSDT-tpcwfma',
'RUNEUSDT-macwfma',
'RSRUSDT-tpcwfma',
'STORJUSDT-tpcwfma',
'ZRXUSDT-tpcwfma',
'IOTAUSDT-tpcwfma',
'ENJUSDT-tpcwfma',
'SANDUSDT-tpcwfma',
];

const TILL_2202_SG = [
'IOTAUSDT-tpcwfma',
'SANDUSDT-tpcwfma',
'RUNEUSDT-macwfma',
'RSRUSDT-tpcwfma',
'QTUMUSDT-macwfma',
'ETHUSDT-macwfma',
'ENJUSDT-tpcwfma',
'BAKEUSDT-tpcwfma',
'STMXUSDT-tpcwfma',
'BALUSDT-macwfma',
'RENUSDT-macwfma',
'OGNUSDT-tpcwfma',
'AVAXUSDT-macwfma',
'DOGEUSDT-macwfma',
];

// 43% ratio, num = mediana - mediana
const TILL_2022_M4S = [
'ARUSDT-tpcwfma',
'STMXUSDT-macwfma',
'GRTUSDT-macwfma',
'STMXUSDT-tpcwfma',
'AVAXUSDT-tpcwfma',
'IOTXUSDT-macwfma',
'DOGEUSDT-macwfma',
'SFPUSDT-tpcwfma',
'COTIUSDT-macwfma',
'LINKUSDT-tpcwfma',
'OCEANUSDT-tpcwfma',
'CELRUSDT-macwfma',
'CHZUSDT-macwfma',
'SOLUSDT-macwfma',
'SCUSDT-tpcwfma',
'DASHUSDT-macwfma',
'RAYUSDT-tpcwfma',
'BCHUSDT-macwfma',
'LINAUSDT-macwfma',
'OGNUSDT-tpcwfma',
'ALICEUSDT-tpcwfma',
'DGBUSDT-macwfma',
'RLCUSDT-tpcwfma',
'XRPUSDT-macwfma',
'DGBUSDT-tpcwfma',
'BTSUSDT-tpcwfma',
'STORJUSDT-tpcwfma',
'MASKUSDT-tpcwfma',
'ICXUSDT-tpcwfma',
'VETUSDT-macwfma',
'GALAUSDT-macwfma',
'TRBUSDT-macwfma',
'IOTXUSDT-tpcwfma',
'BALUSDT-macwfma',
'RUNEUSDT-macwfma',
'FILUSDT-macwfma',
'EGLDUSDT-macwfma',
'RENUSDT-macwfma',
'ADAUSDT-macwfma',
'AUDIOUSDT-macwfma',
'SRMUSDT-macwfma',
'AAVEUSDT-tpcwfma',
'GTCUSDT-tpcwfma',
'OMGUSDT-macwfma',
'AVAXUSDT-macwfma',
'SRMUSDT-tpcwfma',
];


class CUSTOM3 {

    constructor() {
        this.reset();
    }

    reset() {
    }

    hourlyTick(order,flags,orders,hour) {
    }    
 

    getTags(order, flags, orders, tags) 
    {
        const key = order.symbol+'-'+order.strategy;
    
        return {
            T2A: { value:  ( TILL_2202_ALL.includes(key) ? 'Y' : 'N') },
            T2M4: { value: ( TILL_2202_M4.includes(key) ? 'Y' : 'N') },
            T2G: { value: ( TILL_2202_G.includes(key) ? 'Y' : 'N') },
            T2SG: { value: ( TILL_2202_SG.includes(key) ? 'Y' : 'N') },
            T2M4S: { value: ( TILL_2022_M4S.includes(key) ? 'Y' : 'N') }

        }

        return newTags;
    }



}

module.exports = CUSTOM3;

