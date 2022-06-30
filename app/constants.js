// All the years for which there exists data in HSDS
// const YEARS = Array.from({length: 20}, (x,i) => i+1998 );
const YEARS = [
  2018, 2019, 2020
]

const FILE_NAME_APPEND = '.h5';

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
  
const HSDS_URIS = [
        "http://test_user1:test@35.89.200.47:5101", 
      ],
      HSDS_DOMAIN = '/nrel/nsrdb/conus/nsrdb_conus_';

const BUCKET_NAME = 'nrel-pds-hsds';

module.exports = {
  YEARS,
  FIRST_YEAR: YEARS[0],
  LAST_YEAR: YEARS[YEARS.length-1],
  DATASETS,
  HSDS_DOMAIN,
  HSDS_URI: HSDS_URIS[0],
  HSDS_URIS,
  BUCKET_NAME,
  FILE_NAME_APPEND
}
