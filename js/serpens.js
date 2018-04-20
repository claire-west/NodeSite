const router = module.exports = require('express').Router();
const deferred = require('deferred');
const db = require('./db.js');
const request = require('request');
const auth = process.env.SQLA_AUTH;

router.post('/contact', function(req, res) {
    request.get('https://maker.ifttt.com/trigger/contact_entered/with/key/dzkxh5ZCb-Wv4xz18HytMw?value1=' + req.body.value1 + '&value2=' + req.body.value2);
    res.json({
        message: "success"
    });
});

var query = function(sql) {
    var promise = deferred();

    request.post({
        url: 'https://server.claire-west.ca/query',
        headers: {
            auth: auth
        },
        body: sql,
        strictSSL: false
    }, function (e, r, body) {
        if (e) {
            promise.reject(500, e);
        } else if (r.statusCode !== 200) {
            promise.reject(r.statusCode, body);
        } else {
            body = JSON.parse(body);
            if (body[0] && body[0].status === 'error') {
                console.log(body[0].message);
                promise.reject(500);
            } else {
                promise.resolve(body);
            }
        }
    });

    return promise;
};

var sqla = function(oOptions, oArgs) {
    var url = 'https://server.claire-west.ca/' + oOptions.path;
    if (oArgs) {
        var aArgs = [];
        for ( var prop in oArgs) {
            aArgs.push(encodeURIComponent(prop) + '=' + encodeURIComponent(oArgs[prop]));
        }
        url += '?' + aArgs.join('&');
    }

    var promise = deferred();

    request({
        url: url,
        method: oOptions.method,
        headers: {
            auth: auth
        },
        body: oOptions.body,
        strictSSL: false
    }, function (e, r, body) {
        if (e) {
            promise.reject(500, e);
        } else if (r.statusCode !== 200) {
            promise.reject(r.statusCode, body);
        } else {
            body = JSON.parse(body);
            if (body[0] && body[0].status === 'error') {
                console.log(body[0].message);
                promise.reject(500);
            } else {
                promise.resolve(body);
            }
        }
    });

    return promise;
};

router.post('/login', function(req, res) {
    if (req.user) {
        sqla({
            path: 'user',
            method: 'POST'
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name
        }).promise(function(result) {
            res.send(result);
        }, function(status, err) {
            res.status(status).json(err);
        });
    } else {
        res.status(401).send();
    }
});

router.put('/rename', function(req, res) {
    if (req.user) {
        sqla({
            path: 'user',
            method: 'PUT'
        }, {
            id: req.user.id,
            display: req.body
        }).promise(function(result) {
            res.send(result);
        }, function(status, err) {
            res.status(status).json(err);
        });
    } else {
        res.status(401).send();
    }
});

// router.post('/test', function(req, res) {
//     query(req.body).promise(function(result) {
//         res.send(result);
//     }, function(status, err) {
//         res.status(status).json(err);
//     });
// });