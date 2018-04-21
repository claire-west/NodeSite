const router = module.exports = require('express').Router();
const deferred = require('deferred');
const db = require('./db.js');
const request = require('request');

router.post('/*', function(req, res) {
    res.status(404).send();
});