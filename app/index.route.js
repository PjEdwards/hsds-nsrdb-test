const express = require('express'),
      async = require('async'),
      request = require('retry-request', {request: require('request')}),
      csv = require('csv-stringify/lib/sync'),
      utils = require('./utils.js'),
      moment = require('moment'),
      constants = require('./constants.js'),
      { check, validationResult } = require('express-validator/check');

const hsdsUri = constants.HSDS_URI;
      hsdsDomain = constants.HSDS_DOMAIN,
      apiKey = constants.API_KEY,
      router = express.Router();

// Timezones ahead of UTC (+) need the end of the array
// rolled onto the front of the array. Timezones behind
// UTC (-) need the front of the array rolled onto the end
// of the array. Either way the logic is magically
// consistent but the sign needs to be flipped to splice
function hanldeTzOffset(data, tzOffset) {
  let retVal,
      shifted;
  if(tzOffset === 0) {
    retVal = data;
  } else {
    shifted = data.splice((tzOffset*-1));
    retVal = shifted.concat(data)
  }
  return retVal
}

module.exports = router.get('/',
[ //validation
  check('year', `A year between ${constants.FIRST_YEAR} and ${constants.LAST_YEAR} is required`)
      .isInt({min: constants.FIRST_YEAR, max: constants.LAST_YEAR}),
  check('siteId', 'An integer between 0 and 2018391 is required').isInt({min: 0, max: 2018391}),
  check('tzOffset', 'A timezone offset as a float between -12 and 12 is required').isFloat({min: -12.0, max: 12.0}),
  check('interval', 'An integer value of either 30 or 60').isInt().isIn([30,60]),
  check('attributes', 'A valid list of comma separated attributes is required. Values may include ' + constants.DATASETS).custom( v => {
    if(!v) return false;
    let dsets = v.split(','),
        valid = true;
    dsets.forEach( dset => {
      if(!constants.DATASETS.includes(dset)) valid = false;
    });
    return valid;
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
      siteId = parseInt(requestParams['siteId']),
      tzOffset = parseInt(requestParams['tzOffset'], 10),
      interval = parseInt(requestParams['interval'], 10),
      datasets = requestParams['attributes'].split(','),
      selectParm = (interval === 30) ? `[0::1,${siteId}:${siteId+1}:1]` : `[1::2,${siteId}:${siteId+1}:1]`;

  try {
    datasetMeta = await utils.getNSRDBMetaData();
    datasetMeta = datasetMeta[year];

    console.log(`Starting new job at ${startTime} with ${selectParm}`);

    if(!datasets.includes('time_index')) {
      datasets.splice(0, 0, 'time_index');
    }

    // Collect the datasets as parallel requests
    requests = {}
    datasets.forEach(ds => {
      let dsId = datasetMeta.datasets.find(dsm => dsm.name === ds)['id'],
          requestUri = `${hsdsUri}/datasets/${dsId}/value`,
          params = {
            host: `${hsdsDomain}/nsrdb_${year}.h5`,
            select: selectParm
          },
          headers = {
            "X-Api-Key": apiKey
          },
          options = {
            uri: requestUri,
            method: "GET",
            headers: headers,
            qs: params,
          },
          retryOpts = {
            noResponseRetries: 1,
            retries: 3
          };

      //console.log(ds, options);

      requests[ds] = function (callback) {
        request(options, retryOpts, (error, response, body) => {
          if (!error && response.statusCode === 200) {
            let data = JSON.parse(body).value.map(dataPoint => {
              if(ds !== 'time_index') {
                dataPoint = dataPoint[0];
              } 
              return dataPoint;
            });
            data = hanldeTzOffset(data, tzOffset);
            callback(null, data);
          } else {
            callback(true, { msg: `${ds} data could not be fetched`, error: error, res: response });
          }
        })
      };
    });

    // Send all the requests in parallel
    async.parallel(requests, function (err, results) {
      const runTime = moment().diff(startTime, 'ms');
      console.log("All requests (or an error) returned after", runTime/1000, "seconds");
      if (!err) {
        datasets = datasets.filter(ds => ds !== 'time_index');
        let timeIndex = results['time_index'],
            data = [];
            
        // Add the header row
        data.push(['year', 'month', 'day', 'hour', 'minute'].concat(datasets))

        timeIndex.forEach( (timeString, idx) => {
          let ts = moment(timeString),
              tmpRow = [ts.year(), ts.month(), ts.date(), ts.hour(), ts.minute()];

          datasets.forEach(datasetName => {
            let tmpVal = results[datasetName][idx],
                meta = datasetMeta.datasets.find(dsm => dsm.name === datasetName),
                scaleFactor = meta.attributes.find(attr => attr.name === 'psm_scale_factor'),
                offset = meta.attributes.find(attr => attr.name === 'psm_add_offset');

            scaleFactor = scaleFactor ? scaleFactor.value : 1;
            offset = offset ? offset.value : false;

            //if(idx === 10) console.log(datasetName, tmpVal, scaleFactor, offset);

            if(offset) {
              tmpVal = (tmpVal * scaleFactor) + offset;
            } else if(scaleFactor !== 1) {
              tmpVal = tmpVal / scaleFactor;
            }

            tmpVal.toFixed(4);
            tmpRow.push(tmpVal);
          });
          data.push(tmpRow);
        });

        const runTime = moment().diff(startTime, 'ms');
        console.log("All post processing complete after", runTime / 1000, "seconds");
        res.attachment("nsrdb-data-file.csv");
        res.status(200).send(csv(data));
      } else {
        let messages = [],
            statusCode = 200;
        Object.keys(results).forEach(k => {
          if (results[k].msg) {
            messages.push(results[k].msg);
          }
          if (results[k].res) {
            statusCode = results[k].res.statusCode;
            messages.push(results[k].res.body);
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
