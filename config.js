/*
 * Optional settings for Melyik utca?
 *
 * cartoKey: since 25 Sep 2026 CARTO serves its raster basemaps only with an API key
 * (free, no account needed: https://carto.com/basemaps/apikey). Put the key here to
 * use CARTO "light_nolabels" tiles. Left empty, the game draws its own label-free
 * map from OpenStreetMap data (data/basemap.json, made by build_puzzles.py).
 */
window.MELYIKUTCA_CONFIG = {
  cartoKey: '',
};
