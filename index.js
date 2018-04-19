const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const sqlStore = require('connect-mssql')(session);
const auth = require('./js/auth.js');
const cors = require('./js/cors.js');
const db = require('./js/db.js');

const app = express();
app.set('port', (process.env.PORT || 5000));
//app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    cookie: {
        maxAge: 24 * 3600 * 1000 // 24h
    },
    store: new sqlStore(db.config)
}));
app.use(cors([
    'http://claire-west.ca',
    'http://www.claire-west.ca',
    'http://apps.claire-west.ca',
    'http://lib.claire-west.ca',
    'http://localhost',
    'http://serpens.house'
]));
app.use('/logout', auth.logout);
app.use(auth.middleware());
app.post('/login', auth.login);

app.use('/nosql', require('./js/nosql.js'));
app.use('/role', require('./js/role.js'));
app.use('/serpens', require('./js/serpens.js'));
app.use('/go', require('./js/go.js'));
app.use('/echo', require('./js/echo.js'));

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});