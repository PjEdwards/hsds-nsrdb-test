const loadtest = require('loadtest'),
      constants = require('./app/constants'),
      querystring = require('querystring');

// SPECIFY LOADTEST SCALE WITH THESE
const TOTAL_REQUESTS = 50;
const CONCURRENT_CLIENTS = 8;

function statusCallback(error, result, latency) {
  //console.log('Current latency %j, result N/A, error %j', latency, error);
  if(latency.totalRequests === TOTAL_REQUESTS) {
    console.log("--------");
    console.log(latency);
    if (error) {
      console.log(`Error: ${error}`);
    }
  } else {
    console.log('----');
    console.log(`Request ${result.requestIndex} elapsed milliseconds: ${result.requestElapsed}`);
    if(error) {
      console.log(`Error: ${error}`);
    }
  }  
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
  maxRequests: TOTAL_REQUESTS,
  concurrency: CONCURRENT_CLIENTS,
  timeout: 60000,
  requestGenerator: requestRandomizer,
  statusCallback: statusCallback
};

loadtest.loadTest(options, function (error) {
  if (error) {
    return console.error('Got an error: %s', error);
  }
  console.log('Tests run successfully');
});
