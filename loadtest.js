const loadtest = require('loadtest'),
      constants = require('./app/constants'),
      querystring = require('querystring');

function statusCallback(error, result, latency) {
  console.log('Current latency %j, result N/A, error %j', latency, error);
  console.log('----');
  console.log('Request elapsed milliseconds: ', result.requestElapsed);
  console.log('Request index: ', result.requestIndex);
  console.log('Request loadtest() instance index: ', result.instanceIndex);
}

function requestRandomizer(params, options, client, callback) {
  
  let year, siteId, datasets = [], qry;
      
  // Random year
  year = constants.YEARS[Math.floor(Math.random() * constants.YEARS.length)];
  // Random site id
  siteId = Math.floor(Math.random() * 2018392);
  // Random 3 datasets
  for( let i=0; i<3; i++ ) {
    datasets.push(constants.DATASETS[Math.floor(Math.random() * constants.DATASETS.length)]);
  }

  qry = querystring.stringify({
    year: year,
    siteId: siteId,
    attributes: datasets.join(','),
    interval: 30,
    tzOffset: 0
  });
  options.path = `/?${qry}`;
  
  request = client(options, callback);
  return request;
};

const options = {
  url: 'http://localhost:9000/',
  maxRequests: 600,
  timeout: 0,
  concurrency: 30,
  requestGenerator: requestRandomizer,
  statusCallback: statusCallback
};

loadtest.loadTest(options, function (error) {
  if (error) {
    return console.error('Got an error: %s', error);
  }
  console.log('Tests run successfully');
});
