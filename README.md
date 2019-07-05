# hsds-nsrdb-test
NodeJS service to download NSRDB data via HSDS data

## Quickstart

```bash
git clone git@github.com:PjEdwards/hsds-nsrdb-test.git
cd hsds-nsrdb-test
yarn
```

### HSDS requirement
This service requires a running instance of HSDS.  BUCKET_NAME can be set as below, or you can create a bucket as described in the HSDS installation instructions.

For best performance it's desirable that the service run in the AWS uus-west-2 reegion.
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
yarn ltest
```

To customize the test, edit the parameters in the [loadtest script](./loadtest.js)

_*_ *Keep in mind that the number of attributes requested in the URL will equal the number of parallel requests sent to HSDS for each single request sent by loadtest*

For more info, see https://github.com/alexfernandez/loadtest

## NSRDB Target
- 6 requests per second
- sustained for 24 hours
- each request for 4 attributes
- response time for each < 30 seconds
- request years and attributes randomized across full range
