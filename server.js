const express = require('express'),
      indexRoute = require('./app/index.route'),
      wideRoute = require('./app/wide.route'),
      utils = require('./app/utils');

// Preload the meta
utils.getNSRDBMetaData();

const app = express(),
      serverPort = process.env.PORT || 9000;

app.use(express.json());

app.use('/', function(req, res, next) {
  indexRoute(req, res, next);
});

app.use('/wide', function (req, res, next) {
  wideRoute(req, res, next);
});

app.get('/ping', (req, res) => res.send('pong'))

app.listen(serverPort)

console.log(`Running in ${process.env.NODE_ENV} mode`);
