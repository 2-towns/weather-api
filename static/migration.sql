CREATE TABLE IF NOT EXISTS temperature_cache(
   key TEXT PRIMARY KEY,
   celcius FLOAT,
   fahrenheit FLOAT,
   expiration TEXT
);
