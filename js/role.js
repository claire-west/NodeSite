const router = module.exports = require('express').Router();
const deferred = require('deferred');
const db = require('./db.js');
const auth = require('./auth.js');

var getRoles = function(userId) {
    var promise = deferred();
    db.query`
        SELECT role, identifier
          FROM Permissions
         WHERE role LIKE ${userId} + ':%'
         GROUP BY role, identifier
         ORDER BY role, identifier;
    `.then(result => {
        for (var i = 0; i < result.recordset.length; i++) {
            result.recordset[i].role = result.recordset[i].role.split(':')[1];
        }
        result.recordset.sort(function (a, b) {
            return a.role.toLowerCase().localeCompare(b.role.toLowerCase());
        });
        promise.resolve(result.recordset);
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

var grantRole = function(userId, role, identifier) {
    var promise = deferred();
    role = userId + ':' + role;

    db.query`
        INSERT KeyValue ( "Key", Meta, Value )
        VALUES ( ${role}, 'grantRoleTo', ${identifier} );
    `.then(result => {
        if (result.rowsAffected.length && result.rowsAffected[0] > 0) {
            promise.resolve(result.rowsAffected[0]);
        } else {
            promise.reject(400);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

var revokeRole = function(userId, role, identifier) {
    var promise = deferred();
    role = userId + ':' + role;

    db.query`
        DELETE KeyValue
         WHERE "Key" = ${role}
           AND Meta = 'grantRoleTo'
           AND Value = ${identifier};
    `.then(result => {
        if (result.rowsAffected.length && result.rowsAffected[0] > 0) {
            promise.resolve(result.rowsAffected[0]);
        } else {
            promise.reject(404);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

router.get('/', function(req, res) {
    if (req.user === null) {
        return res.status(401).send();
    }

    getRoles(req.user.id).promise(function(result) {
        var roles = {};
        for (var i = 0; i < result.length; i++) {
            var item = result[i];
            roles[item.role] = roles[item.role] || [];
            if (item.identifier) {
                roles[item.role].push(item.identifier);
            }
        }
        res.json(roles);
    }, function(status, err) {
        res.status(status).json(err);
    });
})

router.post('/:role/:identifier', function(req, res) {
    if (req.user === null) {
        return res.status(401).send();
    }

    var identifier = req.params.identifier;
    var role = req.params.role;

    grantRole(req.user.id, role, identifier).promise(function(result) {
        res.json(result);
    }, function(status, err) {
        res.status(status).json(err);
    });
});

router.delete('/:role/:identifier', function(req, res) {
    if (req.user === null) {
        return res.status(401).send();
    }

    var identifier = req.params.identifier;
    var role = req.params.role;

    revokeRole(req.user.id, role, identifier).promise(function(result) {
        res.json(result);
    }, function(status, err) {
        res.status(status).json(err);
    });
});