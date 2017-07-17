const sql = require('mssql');
const config = {
    user: process.env.MSSQL_UID,
    password: process.env.MSSQL_PW,
    server: process.env.MSSQL_SRV,
    database: process.env.MSSQL_DB,
    options: {
        encrypt: true
    }
};

const db = module.exports = new sql.ConnectionPool(config);
db.connect().then(() => {
    console.log('Connected to SQL Server');
}).catch(err => {
    console.log(err);
});