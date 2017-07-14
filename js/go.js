const router = module.exports = require('express').Router();
const db = require('./db.js');

router.get('/:key', function(req, res) {
    var key = req.params.key;
    db.query`
        SELECT *
          FROM KeyValue
         WHERE "Key" = ${key}
           AND Meta = 'redirect';
    `.then(result => {
        res.setHeader('Content-Type', 'text/plain');
        if (result.recordset.length) {
            res.send(result.recordset[0].Value);
        } else {
            res.status(404).send();
        }
    }).catch(err => {
        res.status(500).send(JSON.stringify(err));
    });
});