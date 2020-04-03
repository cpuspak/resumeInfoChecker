var express = require('express');

//routes
var homeRoute = require('./routes/homePage');
var processRoute = require('./routes/processingData');
//

var app = express();

app.set('view engine','ejs');

//use the routes
app.use('/',homeRoute);
app.use('/',processRoute);
//

app.listen(3000);