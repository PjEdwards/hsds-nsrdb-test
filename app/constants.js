// All the years for which there exists data in HSDS
const YEARS = Array.from({length: 20}, (x,i) => i+1998 );

// All the downloadable datasets in HSDS
const DATASETS = [
  'air_temperature',
  'clearsky_dhi',
  'clearsky_dni',
  'clearsky_ghi',
  'cloud_type',
  'dew_point',
  'dhi',
  'dni',
  'fill_flag',
  'ghi',
  'relative_humidity',
  'solar_zenith_angle',
  'surface_albedo',
  'surface_pressure',
  'total_precipitable_water',
  'wind_direction',
  'wind_speed'
]
  
// const HSDS_URI = "http://hsds.nsrdb.test",
const HSDS_URI = "http://hsds.hdf.test",
      HSDS_DOMAIN = '/nrel/nsrdb';

const BUCKET_NAME = 'nrel-pds-hsds';

module.exports = {
  YEARS,
  FIRST_YEAR: YEARS[0],
  LAST_YEAR: YEARS[YEARS.length-1],
  DATASETS,
  HSDS_DOMAIN,
  HSDS_URI,
  BUCKET_NAME
}
