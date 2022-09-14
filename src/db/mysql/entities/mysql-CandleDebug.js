const TABLE_NAME = 'candledebug';

const CREATE_LINES = [
    'vmid      int(11) NOT NULL',
    'time      BIGINT NOT NULL',
    'symbol    CHAR(20) NOT NULL',
    'timeframe CHAR(3) NOT NULL',
    'entries   VARCHAR(4096) DEFAULT NULL',
    'PRIMARY KEY( vmid, time, symbol, timeframe)'
];

async function prepareCandleDebug(con) {

    const resExists = await con.query(`SHOW TABLES LIKE ${TABLE_NAME}`);
    if (resExists.length > 0) { 
        return true;
    }
        
    const sqlQuery = `CREATE TABLE ${TABLE_NAME} (`+CREATE_LINES.join(', ')+')'
        
    const resCreate = await con.query(sqlQuery);
    return true;

}

async function loadCandleDebugs(con, vmId, { symbol, timeframe, timeFrom, timeTo }) {

    const sql = `SELECT * FROM ${TABLE_NAME} WHERE vmid = ${vmId}`;

    if (symbol) { sql += ` AND symbol='${symbol}'` }
    if (timeframe) { sql += ` AND timeframe='${timeframe}'` }
    if (timeFrom) { sql += ` AND time >= ${timeFrom}` }
    if (timeTo) { sql += ` AND time <= ${timeTo}` }
        
    return con.query( sql );

}

async function saveCandleDebugs(con, vmId, items) {

    if (! items || items.length == 0) return;

    const sqlQuery = `INSERT INTO ${TABLE_NAME} 
            (vmid,symbol,timeframe,time,entries) VALUES ?`;

    let values = [];

    items.forEach( (cdb) => {
        let f = cdb.toSTORE();
        values.push([
            vmId,
            f.symbol, f.timeframe, f.time,
            JSON.stringify(f.entries)
        ]);
    })

    const result = await con.query(sqlQuery, [values]);

    console.log("MYSQL-CDLDBG: inserted rows: ", result.affectedRows)
    return true;
}

async function updateCandleDebug(con, vmId, obj) {

    const sqlQuery = `UPDATE ${TABLE_NAME} SET entries=? 
        WHERE vmid = ? AND symbol = ? AND timeframe = ? AND time = ?`;
    const f = obj.toSTORE();
    let values = [
        JSON.stringify(f.entries),
        vmId,
        f.symbol,
        f.timeframe,
        f.time
    ];

    const result = await con.query(sqlQuery, [values]);
    console.log("MYSQL-CDLDBG: updated row: ", result.affectedRows)
    return true;
}

async function resetCandleDebug( con, vmId ) {
    const sqlQuery = `DELETE FROM ${TABLE_NAME} WHERE vmid = ${vmId}`;
    await con.query(sqlQuery);
    return true;
}

module.exports = { 
    updateCandleDebug, loadCandleDebugs, saveCandleDebugs, resetCandleDebug,
    prepareCandleDebug
 };
