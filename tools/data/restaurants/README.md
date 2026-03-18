markdown

# Google Places Restaurant Dataset Collector

This script collects data about restaurants, cafés, bars, and similar places using the **Google Places Text Search API** (default location: Prague city center).

## Requirements
- Google API key with **Places API (New)** enabled
- Python 3 + packages: `requests`, `tqdm`

## How to run

```sh
# 1. Set your API key
export GOOGLE_API_KEY="your_key_here"
# or pass it directly
python google_places_aggregator.py --api-key your_key_here
```

Basic run (default Prague + 20 pages):sh
```sh
python google_places_aggregator.py --api-key your_key_here --download-photos
```

### Useful arguments
- --lat 50.08804 --lng 14.42076 – search center (default: Prague)
- --radius 12000 – search radius in meters (default: 12 km)
- --pages 20 – number of result pages per keyword
- --page-size 20 – results per page
- --keywords-file keywords.json – custom list of search keywords
- --download-photos – downloads photos (saved to out/places_photos/)

## Output structure

```
out/
├── tmp/
│   ├── restaurant.json
│   ├── cafe.json
│   ├── bar.json
│   └── ...                  ← one file per keyword
└── all_places.json              ← final deduplicated dataset (ready to use)
    places_photos/               ← (only if --download-photos was used)

```

`all_places.json` is ready for your project — just copy it to:

```sh
services/activity-recommendation-system/datasets/restaurants/all_places.json
```

