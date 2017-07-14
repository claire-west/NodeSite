const router = module.exports = require('express').Router();

router.use('/*', function(req, res) {
    res.send(JSON.stringify({
        url: req.url,
        method: req.method,
        params: req.params,
        query: req.query,
        headers: req.headers,
        cookies: req.cookies,
        body: req.body,
        user: req.user
    }));
});