const TABLE_NAME = 'candledebug';

async function loadCandleDebugs({con, vmId, symbol, timeframe, timeFrom, timeTo}) {

        const sql = `SELECT * FROM ${TABLE_NAME} WHERE vmid = ${vmId}`;

        if (symbol) { sql += ` AND symbol='${symbol}'` }
        if (timeframe) { sql += ` AND timeframe='${timeframe}'` }
        if (timeFrom) { sql += ` AND time >= ${timeFrom}` }
        if (timeTo) { sql += ` AND time <= ${timeTo}` }
        
        return new Promise(function(resolve, reject) {
            con.query( sql,
                function (err, result, fields) {
                    if (err) reject(err);
                    return resolve(result);
                }
            );
        });

    }

function saveCandleDebug({con, vmId, symbol, timeframe, time, entries}) {
    // ... save
}

function updateCandleDebug({con, vmId, symbol, timeframe, time, entries}) {

}

function resetCandleDebug( {con, vmId} ) {

    const sql = `DELETE FROM ${TABLE_NAME} WHERE vmid = ${vmId}`;

    return new Promise(function(resolve, reject) {
        con.query( sql, 
            function (err, result, fields) {
                if (err) reject(err);
                return resolve(result);
            }
        );
    });
}

export { updateCandleDebug, loadCandleDebugs, saveCandleDebug, resetCandleDebug };
