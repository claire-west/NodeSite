const router = module.exports = require('express').Router();
const deferred = require('deferred');
const db = require('./db.js');
const request = require('request');
const htmldiff = require('node-htmldiff');
const emoji = require('node-emoji');
const auth = process.env.SQLA_AUTH;
const discordId = process.env.DISCORD_ID;
const discordSecret = process.env.DISCORD_SECRET;
const swnbotKey = process.env.SWNBOT_API_KEY;

router.post('/contact', function(req, res) {
    request.get('https://maker.ifttt.com/trigger/contact_entered/with/key/dzkxh5ZCb-Wv4xz18HytMw?value1=' + req.body.value1 + '&value2=' + req.body.value2);
    res.json({
        message: "success"
    });
});

var query = function(sql) {
    var promise = deferred();

    request.post({
        url: 'https://aws.claire-west.ca/query',
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
    var url = 'https://aws.claire-west.ca/' + oOptions.path;
    if (oArgs) {
        var aArgs = [];
        for ( var prop in oArgs) {
            if (oArgs[prop]) {
                aArgs.push(encodeURIComponent(prop) + '=' + encodeURIComponent(oArgs[prop]));
            }
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
            console.log(r.statusCode, body)
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

var roleIDs = {
    serpens: '435452473608503306',
    mod: '434800155582005251',
    admin: '434800365301399572'
};

var isSerpens = function(req, res) {
    var roles = req.discordUser.roles;
    if (!roles) {
        res.status(401).send();
        return false;
    }
    for (var i = 0; i < roles.length; i++) {
        if (roles[i].roleID === roleIDs.serpens) {
            return true;
        }
    }
    res.status(403).send();
    return false;
};

router.get('/doc', function(req, res) {
    if (!req.discordUser) {
        res.status(401).send();
        return;
    }

    if (isSerpens(req, res)) {
        sqla({
            path: 'doc_list',
            method: 'GET'
        }).promise(function(result) {
            for (var i = 0; i < result.length; i++) {
                result[i].display = emoji.emojify(result[i].display);
            }
            res.send(result);
        }, function(status, err) {
            res.status(status).json(err);
        });
    }
});

router.get('/doc/:doc_id', function(req, res) {
    if (!req.discordUser) {
        res.status(401).send();
        return;
    }

    if (isSerpens(req, res)) {
        sqla({
            path: 'document',
            method: 'GET'
        }, {
            doc_id: req.params.doc_id
        }).promise(function(result) {
            if (result[0]) {
                result = result[0];
            }

            res.send(result);
        }, function(status, err) {
            res.status(status).json(err);
        });
    }
});

router.post('/doc', function(req, res) {
    if (!req.discordUser) {
        res.status(401).send();
        return;
    }

    if (isSerpens(req, res)) {
        sqla({
            path: 'document',
            method: 'POST',
            body: req.body.content
        }, {
            doc_id: req.body.doc_id,
            title: req.body.title,
            owner: req.discordUser.id
        }).promise(function(result) {
            if (result[0]) {
                result = result[0];
            }

            res.send(result);
        }, function(status, err) {
            res.status(status).json(err);
        });
    }
});

router.put('/doc', function(req, res) {
    if (!req.discordUser) {
        res.status(401).send();
        return;
    }

    if (isSerpens(req, res)) {
        sqla({
            path: 'document',
            method: 'GET'
        }, {
            doc_id: req.body.doc_id
        }).promise(function(result) {
            if (result[0]) {
                result = result[0];
            }

            var diff = htmldiff(result.content, req.body.content);

            sqla({
                path: 'document',
                method: 'PUT',
                body: JSON.stringify({
                    content: req.body.content,
                    previous: result.content,
                    diff: diff,
                    summary: req.body.summary
                })
            }, {
                doc_id: req.body.doc_id,
                title: req.body.title,
                user_id: req.discordUser.id,
                user_name: req.discordUser.name
            }).promise(function(result) {
                if (result[0]) {
                    result = result[0];
                }

                res.send(result);
            }, function(status, err) {
                res.status(status).json(err);
            });
        }, function(status, err) {
            res.status(status).json(err);
        });
    }
});

router.get('/login', function(req, res) {
    if (req.session['discord-auth-info']) {
        req.discordUser = req.session['discord-auth-info'];
    }

    if (req.discordUser) {
        var info = req.discordUser;
        request.get({
            url: 'https://swnbot.itmebot.com/api/user/' + info.id,
            headers: {
                Authorization: swnbotKey
            },
            encoding: 'utf8',
            gzip: true
        }, function (e, r, body) {
            if (e) {
                res.status(500).json(e);
            } else {
                if (r.statusCode === 200) {
                    body = JSON.parse(emoji.unemojify(body));
                    info.name = body.userName;
                    info.display = body.userNick;
                    info.roles = JSON.stringify(body.userRoles);
                }

                sqla({
                    path: 'user',
                    method: 'PUT'
                }, {
                    id: info.id,
                    name: info.name,
                    display: info.display,
                    avatar: info.avatar,
                    roles: info.roles
                }).promise(function(result) {
                    if (result[0]) {
                        result = result[0];
                    }
                    if (typeof(result.roles) === 'string') {
                        result.roles = JSON.parse(result.roles);
                    }
                    if (result.avatar) {
                        result.avatarUrl = 'https://cdn.discordapp.com/avatars/' + result.id + '/' + result.avatar + '.png?size=128'
                    }

                    req.session['discord-auth-info'] = result;

                    res.send(JSON.parse(emoji.emojify(JSON.stringify(result))));
                }, function(status, err) {
                    res.status(status).json(err);
                });
            }
        });

        return;
    }

    res.status(401).send();
});

router.post('/login/:token', function(req, res) {
    var promise = deferred();
    request.get({
        url: 'https://discordapp.com/api/users/@me',
        headers: {
            Authorization: 'Bearer ' + req.params.token
        }
    }, function (e, r, body) {
        if (e) {
            promise.reject(500, e);
        } else if (r.statusCode !== 200) {
            console.log(r.statusCode, body)
            promise.reject(r.statusCode, body);
        } else {
            body = JSON.parse(body);
            promise.resolve(body);
        }
    });

    promise.promise(function(info) {
        request.get({
            url: 'https://swnbot.itmebot.com/api/user/' + info.id,
            headers: {
                Authorization: swnbotKey
            },
            encoding: 'utf8',
            gzip: true
        }, function (e, r, body) {
            if (e) {
                res.status(500).json(e);
            } else {
                if (r.statusCode === 200) {
                    body = JSON.parse(emoji.unemojify(body));
                    info.name = body.userName;
                    info.display = body.userNick;
                    info.roles = JSON.stringify(body.userRoles);
                }

                sqla({
                    path: 'user',
                    method: 'POST'
                }, {
                    id: info.id,
                    name: info.name,
                    display: info.display,
                    avatar: info.avatar,
                    roles: info.roles
                }).promise(function(result) {
                    if (result[0]) {
                        result = result[0];
                    }
                    if (typeof(result.roles) === 'string') {
                        result.roles = JSON.parse(result.roles);
                    }
                    if (result.avatar) {
                        result.avatarUrl = 'https://cdn.discordapp.com/avatars/' + result.id + '/' + result.avatar + '.png?size=128'
                    }

                    req.session['discord-auth-info'] = result;

                    res.send(JSON.parse(emoji.emojify(JSON.stringify(result))));
                }, function(status, err) {
                    res.status(status).json(err);
                });
            }
        });
    }, function(status, err) {
        res.status(status).json(err);
    });
});

router.use('/logout', function(req, res) {
    req.session.destroy();
    res.clearCookie('discord-auth-token');
    res.send();
});