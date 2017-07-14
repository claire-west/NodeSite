const router = module.exports = require('express').Router();
const db = require('./db.js');

var getAll = function(req, res) {
    if (!req.user) {
        return res.sendStatus(401);
    }

    if (req.user.admin.rank !== 'super') {
        return res.sendStatus(403);
    }

    db.query`
        SELECT "Key", Value
          FROM KeyValue
         WHERE Meta = 'redirect';
    `.then(result => {
        res.send(result.recordset);
    }).catch(err => {
        res.status(500).json(err);
    });
};

var getRedirect = function(key, res) {
    key = key.split('/').join('');

    db.query`
        SELECT *
          FROM KeyValue
         WHERE LOWER( "Key" ) = ${key}
           AND Meta = 'redirect';
    `.then(result => {
        res.setHeader('Content-Type', 'text/plain');
        if (result.recordset.length) {
            res.send(result.recordset[0].Value);
        } else {
            res.sendStatus(404);
        }
    }).catch(err => {
        res.status(500).json(err);
    });
};

router.get('/*', function(req, res) {
    var key = req.params[0].toLocaleLowerCase();
    if (key) {
        getRedirect(key, res);
    } else {
        getAll(req, res);
    }
});

router.post('/:key', function(req, res) {
    if (!req.user) {
        return res.sendStatus(401);
    }

    if (req.user.admin.rank !== 'super') {
        return res.sendStatus(403);
    }

    var key = req.params.key;
    var value = req.body;
    db.query`
        INSERT KeyValue ( "Key", Meta, Value )
        VALUES ( ${key}, 'redirect', ${value} );
    `.then(result => {
        if (result.rowsAffected.length && result.rowsAffected[0] > 0) {
            res.json(result.rowsAffected[0]);
        } else {
            res.sendStatus(400);
        }
    }).catch(err => {
        res.status(500).json(err);
    });
});

router.delete('/:key', function(req, res) {
    if (!req.user) {
        return res.sendStatus(401);
    }

    if (req.user.admin.rank !== 'super') {
        return res.sendStatus(403);
    }

    var key = req.params.key;
    db.query`
        DELETE KeyValue
         WHERE "Key" = ${key}
           AND Meta = 'redirect';
    `.then(result => {
        if (result.rowsAffected.length && result.rowsAffected[0] > 0) {
            res.json(result.rowsAffected[0]);
        } else {
            res.sendStatus(400);
        }
    }).catch(err => {
        res.status(500).json(err);
    });
});