const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
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
    saveUninitialized: false
}));
app.use(cors([
    'http://apps.isaac-west.ca',
    'http://localhost'
]));
app.use('/logout', auth.logout);
app.use(auth.middleware());
app.post('/login', auth.login);

app.use('/nosql', require('./js/nosql.js'));
app.use('/role', require('./js/role.js'));
app.use('/go', require('./js/go.js'));
app.use('/echo', require('./js/echo.js'));

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});