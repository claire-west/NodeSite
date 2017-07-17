module.exports = function(origins) {
    return function(req, res, next) {
        if (origins.indexOf(req.headers.origin) > -1) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || null);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, auth');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        res.setHeader('Content-Type', 'application/json');
        next();
    }
};