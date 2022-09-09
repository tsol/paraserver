const TABLE_NAME = 'candledebug';

async function loadCandleDebugs({con, vmId, symbol, timeframe, timeFrom, timeTo}) {

        if (! vmId) 
            { throw Error('MSQL-CDB: vmId required on load'); }

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

function saveCandleDebug(params = {con, vmId, symbol, timeframe, time, data}) {
    if (time < lastSavedTimestamp ) {
        return updateCandleDebug(params);
    }

    if (time > lastSavedTimestamp) { lastSavedTimestamp = time }

    // ... save
}

function updateCandleDebug({con, vmId, symbol, timeframe, time, data}) {

}

export default { updateCandleDebug, loadCandleDebugs, saveCandleDebug };
