# hsds-nsrdb-test
NodeJS service to download NSRDB data via HSDS data

## Quickstart

```bash
git clone git@github.com:PjEdwards/hsds-nsrdb-test.git
cd hsds-nsrdb-test
yarn
```

### HSDS requirement
This service requires a running instance of HSDS configured with the S3 bucket containing the NSRDB Data
```
BUCKET_NAME=nrel-pds-hsds
AWS_REGION=us-west-2
AWS_S3_GATEWAY=http://s3.us-west-2.amazonaws.com
```

### Configure
edit [the constants file](./app/constants.js) setting the appropriate `HSDS_URI`

### Start
run `yarn start` (or `yarn dev` if you want to support hot reloading)

### Intialization routine
on startup the service will attempt to fetch the metadata from HSDS. If successful you will see a series of messages in the console shortly after startup which, if successful, will culminate in a message that states:
> NSRDB meta fetch complete after 4.755 seconds

If this initialization fails then the most likely culprit is the connection to the HSDS service, or the HSDS service does not see the NSRDB data bucket. In any case, this service can't work if initialization of the metadata fails.

## To Loadtest
Start the service as above, then
```bash
./node_modules/.bin/loadtest -n 200 -c 30 --timeout 0 -k "http://localhost:9000/?year=2004&siteId=262343&attributes=dni,ghi,solar_zenith_angle&tzOffset=0&interval=60"
```

- `-n` is the number of total requests that will be sent
- `-c` is the number of requests that will be sent at a time
- `--timeout` sets the request timeout, a value of 0 disables timeout
- `--k` the url to hit *

_*_ *Keep in mind that the number of attributes requested in the URL will equal the number of parallel requests sent to HSDS for each single request sent by loadtest*

For more info, see https://github.com/alexfernandez/loadtest

## NSRDB Target
- 6 requests per second
- sustained for 24 hours
- each request for 4 attributes
- response time for each < 30 seconds
- request years and attributes randomized across full range

