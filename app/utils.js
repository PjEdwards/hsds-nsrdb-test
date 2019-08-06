const moment = require('moment'),
      constants = require('./constants.js'),
      parallelLimit = require('async/parallelLimit'),
      axios = require('axios'),
      fs = require('fs');

// A class variable to store the HDF meta
let NSRDB_META = null;

const _initNSRDBMetaForAttr = function(year, dataset, attr, axiosInstance) {
  const req = function(callback) {    
    // Fifth get the value of each available attribute
    let axiosOpts = {
      params: {
        domain: `${constants.HSDS_DOMAIN}/nsrdb_${year}${constants.FILE_NAME_APPEND}.h5`,
        bucket: `${constants.BUCKET_NAME}`
      },
      url: `/datasets/${dataset.id}/attributes/${attr.name}`
    };
    axiosInstance.request(axiosOpts)
    .then(resp => {
      attr.value = resp.data.value;
      callback(false, attr);
    })
    .catch(err => {
      callback(true, {
        msg: `Failed to load NSRDB meta for ${year}, dataset ${dataset.name}, while loading attribute value for ${attr.name} with ${err}`,
        error: err
      });
    })    
  }
  return req;
}

const _initNSRDBMetaForDataset = function (year, dataset, axiosInstance) {
  const req = function (callback) {
    let axiosOpts = {
      params: {
        domain: `${constants.HSDS_DOMAIN}/nsrdb_${year}${constants.FILE_NAME_APPEND}.h5`,
        bucket: `${constants.BUCKET_NAME}`
      },
      url: `/datasets/${dataset.id}/attributes`
    };
    axiosInstance.request(axiosOpts)
    .then(resp => {
      let dsAttributes = resp.data.attributes.map(attr => {
        return { 'name': attr.name };
      });
      dataset.attributes = dsAttributes;
      callback(false, dataset);
    })
    .catch(err => {
      callback(true, {
        msg: `Failed to load NSRDB meta for ${year}, dataset ${dataset.name}, while loading attributes with ${err}`,
        error: err
      });
    });
  }
  return req;
}

const _initNSRDBMetaForYear = function(year, axiosInstance) {
  const req = function(callback) {
    let meta = {},
        axiosOpts = {
          params: {
            domain: `${constants.HSDS_DOMAIN}/nsrdb_${year}${constants.FILE_NAME_APPEND}.h5`,
            bucket: `${constants.BUCKET_NAME}`
          }
        };

    // There are a few requests needed to load meta for each year
    try {
      // First get the group id for future requests
      axiosInstance.request(axiosOpts)
        .then(resp => {
          let groupId = resp.data.root;

          // Second get the version attribute of this NSRDB file
          //axiosOpts.url = `/groups/${groupId}/attributes/version`;
          //axiosInstance.request(axiosOpts)
            //.then(resp => {
              //meta.version = resp.data.value;

              // Third get the list of available datasets
              axiosOpts.url = `/groups/${groupId}/links`;
              axiosInstance.request(axiosOpts)
                .then(resp => {
                  let datasets = resp.data.links.map(ds => {
                    return {
                      "id": ds.id,
                      "name": ds.title,
                      "attributes": []
                    }
                  });
                  meta.datasets = datasets;
                  NSRDB_META[year] = meta;
                  callback(null, meta);
                })
                .catch(err => {
                  callback(true, {
                    msg: `Failed to load NSRDB meta for ${year} with ${err}`,
                    error: err
                  });
                })
            //})
            //.catch(err => {
            //  callback(true, {
            //     msg: `Failed to load NSRDB meta for ${year} with ${err}`,
            //     error: err
            //   });
            // })
        })
        .catch(err => {
          callback(true, {
            msg: `Failed to load NSRDB meta for ${year} with ${err}`,
            error: err
          });
        })
    } catch (err) {
      callback(true, {
        msg: `Failed to load NSRDB meta for ${year} with ${err}`,
        error: err
      });
    }
  }

  return req;
}

const _initNSRDBMetaFromHSDS = async function() {
  console.log("Loading NSRDB meta from HSDS");
  NSRDB_META = {};
  let startTime = moment(),
      axiosInstance = axios.create({
        baseURL: constants.HSDS_URI
      }),
      years = constants.YEARS,
      requests = {};

  years.forEach( year => {
    requests[year] = _initNSRDBMetaForYear(year, axiosInstance);      
  });

  // Send all the requests in parallel
  try {
    //let results = 
    parallelLimit(requests, 10, (error, results) => {
      const runTime = moment().diff(startTime, 'ms');
      console.log("First round of requests returned after", runTime/1000, "seconds");
      if(!error) {
        
        NSRDB_META = results;
        // Fourth get a list of available attributes for each dataset
        requests = [];
        results[years[0]].datasets.forEach(dataset => {
          requests.push(_initNSRDBMetaForDataset(years[0], dataset, axiosInstance));
        });

        parallelLimit(requests, 10, (error, results) => {
          const runTime = moment().diff(startTime, 'ms');
          console.log("Second round of requests returned after", runTime/1000, "seconds");
          if(!error) {
            requests = [];
            NSRDB_META[years[0]].datasets.forEach(dataset => {
              dataset.attributes.forEach(attr => {
                requests.push(_initNSRDBMetaForAttr(years[0], dataset, attr, axiosInstance));
              })
            });

            parallelLimit(requests, 10, (error, results) => {
              const runTime = moment().diff(startTime, 'ms');
              console.log("Final round of requests returned after", runTime/1000, "seconds");
              if(!error) {
                try {
                  let masterDatasets = NSRDB_META[years[0]].datasets;
                  years.forEach( (year, yidx) => {
                    if(yidx > 0) {
                      year = NSRDB_META[year];
                      year.datasets.forEach((ds) => {
                        ds.attributes = masterDatasets.find(mds=>mds.name===ds.name).attributes;
                      })
                    }
                  })
                  fs.writeFileSync('./app/nsrdbmeta.json', JSON.stringify(NSRDB_META, null, 2));
                  const runTime = moment().diff(startTime, 'ms');
                  console.log("NSRDB meta fetch complete after", runTime/1000, "seconds");
                } catch(err) {
                  console.log(err);
                }
              } else {
                console.log(error);
                console.log(results);
              }
            })
          } else {
            console.log(error);
            console.log(results);
          }
        });
      } else {
        console.log(JSON.stringify(error, null, 2));
        console.log(JSON.stringify(results, null, 2));
      }
    })
  } catch(error) {
    console.log(JSON.stringify(error, null, 2));
  }
}

const _initNSRDBMeta = async function () {
  try {
    let stats = fs.statSync('./app/nsrdbmeta.json');
    let mtime = moment(stats.mtime);
    if(moment().diff(mtime, 'hours') > 24) {
      _initNSRDBMetaFromHSDS();
    } else {
      NSRDB_META = require('./nsrdbmeta.json');
      console.log(`NSRDB meta fetch complete from file`);
    }
  } catch(err) {
    _initNSRDBMetaFromHSDS();
  }
}

const getNSRDBMetaData = async function() {
  if(!NSRDB_META) {
    await _initNSRDBMeta();
  }
  return NSRDB_META;
}

module.exports = {
  getNSRDBMetaData
}
