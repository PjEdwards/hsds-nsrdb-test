# hsds-nsrdb-test
NodeJS service to download NSRDB data via HSDS data

# Quickstart
- edit [the constants file](./app/constants.js) setting the appropriate `HSDS_URI`
- run `yarn start` (or `yarn dev` if you want to support hot reloading)
- on startup the service will attempt to fetch the metadata from HSDS. If successful you will see a series of messages in the console shortly after startup which, if successful, will culminate in a message that states:
> NSRDB meta fetch complete after 4.755 seconds

# To Loadtest
Start the service as above, then
```bash
./node_modules/.bin/loadtest -n 200 -c 30 --timeout 0 -k "http://localhost:9000/?year=2004&siteId=262343&attributes=dni,ghi,solar_zenith_angle&tzOffset=0&interval=60"
```

- `-n` is the number of total requests that will be sent
- `-c` is the number of requests that will be sent at a time
- `--timeout` sets the request timeout, a value of 0 disables timeout
- `--k` the url to hit *

_*_ *Keep in mind that the number of attributes requested in the URL will equal the number of parallel requests sent to HSDS for each single request sent by loadtest*
