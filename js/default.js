const router = module.exports = require('express').Router();
const deferred = require('deferred');
const db = require('./db.js');
const request = require('request');
const fs = require('fs');

var applyTemplate = function(string, args) {
    for (var prop in args) {
        string = string.replace('{{' + prop + '}}', args[prop]);
    }
    return string;
}

var newsRedirect = function(req, res, id) {
    var url = 'http://serpens.house/#news/' + id;
    var html = fs.readFileSync('html/serpens-news-redirect.html', 'utf-8');
    html = applyTemplate(html, {
        url: url
    });
    res.setHeader('content-type', 'text/html');
    res.send(html);
}

router.use('/*', function(req, res, next) {
    var host = req.get('host');
    var args = req.params[0].split('/');
    if (host === 'news.serpens.house' ||
        host === 'server.claire-west.ca:5000') {
        newsRedirect(req, res, args[0]);
    } else {
        next();
    }
});