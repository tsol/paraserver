
    const TFRAMES = [
        { name: '1d', limit:  300 },
        { name: '4h', limit:  1000 },
        { name: '30m', limit: 1000 },
        { name: '5m', limit: 1000 },
        { name: '1m', limit: 1000 }
    ];

    function NEXT_TFRAME(timeframe) {
        // todo: use static definition in Timeframes
        switch (timeframe) {
            case '1m': return '30m';
            case '5m': return '4h';
            case '30m': return '4h';
            case '4h': return '1d';
        }
        return undefined;
    };

    module.exports = { TFRAMES, NEXT_TFRAME };
