const express = require('express'),
      async = require('async'),
      request = require('retry-request', {request: require('request')}),
      csv = require('csv-stringify/lib/sync'),
      utils = require('./utils.js'),
      moment = require('moment'),
      constants = require('./constants.js'),
      { check, validationResult } = require('express-validator/check');

const hsdsUriCount = constants.HSDS_URIS.length,
      hsdsDomain = constants.HSDS_DOMAIN,
      bucket = constants.BUCKET_NAME,
      apiKey = constants.API_KEY,
      router = express.Router();

let lastUriId = 0;
function getHsdsUri() {
  let nextId = lastUriId+1 === hsdsUriCount ? 0 : lastUriId+1;
  let uri = constants.HSDS_URIS[nextId];
  lastUriId = nextId;
  return uri;
}

module.exports = router.get('/',
[ //validation
  check('year', `A year between ${constants.FIRST_YEAR} and ${constants.LAST_YEAR} is required`)
      .isInt({min: constants.FIRST_YEAR, max: constants.LAST_YEAR}),
  check('attribute', 'A valid single attribute is required. Values may include any one of ' + constants.DATASETS).custom( v => {
    if(!v) return false;
    return constants.DATASETS.includes(v);
  })
],
async function(req, res, next){

  let datasetMeta;
  const startTime = moment();
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  // Grab the input params
  let requestParams = req.query,
      year = requestParams['year'],
      dataset = requestParams['attribute'],
      randomTimestep = Math.floor(Math.random() * (17000 + 1)),
      selectParm = `[${randomTimestep}:${randomTimestep+1}:1,0:2018391:1]`;

  try {
    datasetMeta = await utils.getNSRDBMetaData();
    datasetMeta = datasetMeta[year];


    console.log(`Starting new job at ${startTime} with ${selectParm}, ${year}, ${dataset}`);

    // Collect the datasets as parallel requests
    let req;
    let dsId = datasetMeta.datasets.find(dsm => dsm.name === dataset)['id'],
        requestUri = `${getHsdsUri()}/datasets/${dsId}/value`,
        params = {
          domain: `${hsdsDomain}${year}${constants.FILE_NAME_APPEND}`,
          select: selectParm,
          bucket: `${bucket}`
        },
        options = {
          uri: requestUri,
          method: "GET",
          qs: params,
        },
        retryOpts = {
          noResponseRetries: 1,
          retries: 3
        };

    //console.log(ds, JSON.stringify(options, null, 2));

    req = function (callback) {
      request(options, retryOpts, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          let data = JSON.parse(body).value[0];
          callback(null, data);
        } else {
          callback(true, { msg: `${dataset} data could not be fetched`, error: error, res: response });
        }
      })
    };

    // Send all the requests in parallel
    async.parallel([req], function (err, results) {
      const runTime = moment().diff(startTime, 'ms');
      console.log("All requests (or an error) returned after", runTime/1000, "seconds");

      if (!err) {
        let data = results[0];
        const runTime = moment().diff(startTime, 'ms');
        console.log("All post processing complete after", runTime / 1000, "seconds");
        res.attachment("nsrdb-data-file.csv");
        res.status(200).send(csv([[dataset],data.slice(2000,2500)]));
      } else {
        let messages = [],
            statusCode = 500;
        results.forEach(k => {
          if (k.msg) {
            messages.push(k.msg);
          }
          if (k.res) {
            statusCode = k.res.statusCode;
            messages.push(k.res.body);
          }
        });
        console.log(`Job ${startTime} with ${selectParm} Failure!`);
        console.log(messages.join("\n"));
        res.status(statusCode).send(messages.join("\n"));
      }
    });
  } catch (err) {
    console.log("Failed to load NSRDB meta");
    console.log(err);
    return res.status(500).json({ errors: [err]});
  }
});
