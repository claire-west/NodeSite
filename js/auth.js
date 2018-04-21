const deferred = require('deferred');
const db = require('./db.js');
const GoogleAuth = require('google-auth-library');
const gauth = new GoogleAuth;
const clientId = process.env.G_CLIENT_ID;
const client = new gauth.OAuth2(clientId, '', '');

var auth = module.exports = {
    middleware: {
        google: function() {
             return function verify(req, res, next) {
                if (req.user) {
                    return next();
                }

                if (req.session['google-auth-info']) {
                    req.user = req.session['google-auth-info'];
                    return next();
                }

                const token = req.cookies['google-auth-token'] || req.headers['auth'];
                if (!token) {
                    req.user = null;
                    return next();
                }

                auth.verify(token).promise(function(info) {
                    req.session['google-auth-info'] = info;
                    req.user = info;
                    next();
                }, function(e) {
                    req.user = null;
                    next();
                });
            };
        },

        discord: function() {
            return function verify(req, res, next) {
                if (req.discordUser) {
                    next();
                }

                if (req.session['discord-auth-info']) {
                    req.discordUser = req.session['discord-auth-info'];
                    next();
                }

                next();
            }
        }
    },

    login: function(req, res) {
        var token = req.body;
        auth.verify(token).promise(function(info) {
            req.session.regenerate(function(err) {
                if (err) {
                    res.status(400).send(e);
                } else {
                    req.session['google-auth-info'] = info;
                    var options = {
                        httpOnly: true
                    };
                    if (req.origin) {
                        options.domain = '.node.claire-west.ca';
                    }
                    res.cookie('google-auth-token', token, options);
                    res.json(info);
                }
            });
        }, function(e) {
            res.status(401).send(e);
        });
    },

    logout: function(req, res) {
        req.session.destroy();
        res.clearCookie('google-auth-token');
        res.send();
    },

    verify: function(token) {
        var promise = deferred();

        try {
            client.verifyIdToken(token,
                clientId,
                function(e, login) {
                    if (e) {
                        promise.reject(e);
                    } else {
                        var payload = login.getPayload();
                        var user = {
                            id: payload['sub'],
                            name: payload['name'],
                            email: payload['email'],
                            admin: null
                        };

                        auth.getAdminStatus(user.email).promise(function(result) {
                            user.admin = {
                                rank: result.rank,
                                tier: result.tier
                            }
                            promise.resolve(user);
                        }, function() {
                            promise.resolve(user);
                        });
                    }
                }
            );
        } catch (e) {
            promise.reject(e);
        }

        return promise;
    },

    getAdminStatus: function(email) {
        var promise = deferred();
        db.query`
            SELECT *
              FROM Admins
             WHERE "user" = ${email};
        `.then(result => {
            if (result.recordset.length) {
                promise.resolve(result.recordset[0]);
            } else {
                promise.reject(400);
            }
        }).catch(err => {
            console.log(err)
            promise.reject(500, err);
        });
        return promise;
    }
};