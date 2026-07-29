# MatsyaMitra Analytics

This folder contains the reusable Earth Engine extraction framework for the MatsyaMitra Earth Observation Pipeline.

The Earth Engine environment is assumed to be configured already:

- Earth Engine Community registration is complete.
- Google Cloud Project linking is complete.
- Python Earth Engine API is installed in the local virtual environment.
- Authentication has already been completed.
- `analytics/data/geometry/karnataka_aoi.geojson` is the canonical AOI for every extraction script.

## Framework Modules

- `config.py`: project, AOI, date, sampling, and dataset configuration models.
- `geometry.py`: GeoJSON AOI loading and Earth Engine geometry conversion.
- `datasets.py`: centralized Earth Engine dataset registry and collection loading.
- `extractor.py`: generic ImageCollection filtering, first-image selection, clipping, configured value scaling, and metadata normalization.
- `sampler.py`: generic raster sampling into a Pandas DataFrame.
- `validation.py`: NOAA OISST-backed validation driver for the framework.

## Validation

NOAA OISST v2.1 is used only to validate the reusable framework.

Run from the project root:

```powershell
analytics\.venv\Scripts\python.exe -m analytics.validation
```

Expected output columns:

- `Latitude`
- `Longitude`
- `Date`
- `Parameter`
- `Value`
- `Dataset`

## Extension Pattern

To add a new Earth Engine dataset later, register it in `datasets.py` and reuse the same geometry, extractor, and sampler modules. Do not hardcode coordinates or dataset IDs in extraction scripts.
