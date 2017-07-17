const deferred = require('deferred');
const GoogleAuth = require('google-auth-library');
const gauth = new GoogleAuth;
const clientId = process.env.G_CLIENT_ID;
const client = new gauth.OAuth2(clientId, '', '');

var auth = module.exports = {
    middleware: function() {
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

    login: function(req, res) {
        var token = req.body;
        auth.verify(token).promise(function(info) {
            req.session['google-auth-info'] = info;
            var options = {
                httpOnly: true,
                expires: new Date(new Date().setYear(new Date().getFullYear() + 1))
            };
            if (req.origin) {
                options.domain = '.node.isaac-west.ca';
            }
            res.cookie('google-auth-token', token, options);
            res.send(JSON.stringify(info));
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
                        promise.resolve({
                            id: payload['sub'],
                            name: payload['name'],
                            email: payload['email']
                        });
                    }
                }
            );
        } catch (e) {
            promise.reject(e);
        }

        return promise;
    }
};