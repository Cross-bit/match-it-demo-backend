#!/bin/python3

from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
import hashlib
import logging
import os
from typing import Dict
import requests
import json
from tqdm import tqdm


GOOGLE_PLACES_TEXT_SEARCH_API_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_PLACES_PHOTOS_SEARCH_API_URL = "https://places.googleapis.com/v1"

GOOGLE_API_KEY = None  # will be set in main()


GOOGLE_FIELD_MASK = "places.displayName,\
places.id,\
places.formattedAddress,\
places.priceLevel,\
places.displayName,\
places.allowsDogs,\
places.rating,\
places.reviews,\
places.priceLevel,\
places.photos,\
places.googleMapsUri,\
places.location,\
places.regularOpeningHours,\
places.goodForGroups,\
places.goodForChildren,\
places.outdoorSeating,\
places.delivery,\
places.takeout,\
places.liveMusic,\
places.servesVegetarianFood,\
places.types"


DEFAULT_KEYWORDS = [
    "restaurant", "cafe", "bar", "pub",
    "italian_restaurant", "japanese_restaurant", "sushi_restaurant",
    "pizza_restaurant", "indian_restaurant", "mexican_restaurant",
    "thai_restaurant", "vegan_restaurant", "vegetarian_restaurant",
    "fast_food_restaurant", "brunch_restaurant", "fine_dining_restaurant",
    "buffet_restaurant", "seafood_restaurant",
    "hospoda", "pivnice", "kantýna", "čajovna", "klub", "fastfood"
]


def parse_args():
    parser = argparse.ArgumentParser(description="Google Places dataset aggregator")

    parser.add_argument("--lat", type=float, default=50.08804)
    parser.add_argument("--lng", type=float, default=14.42076)
    parser.add_argument("--radius", type=float, default=12000.0)

    parser.add_argument("--page-size", type=int, default=20)
    parser.add_argument("--pages", type=int, default=20)

    parser.add_argument("--keywords-file", type=str)
    parser.add_argument("--output-dir", type=str, default="out")

    parser.add_argument("--api-key", type=str, help="Google API key")
    parser.add_argument("--download-photos", action="store_true")

    return parser.parse_args()


def load_keywords(path):
    if path:
        with open(path) as f:
            return json.load(f)
    return DEFAULT_KEYWORDS


def store_api_restaurants_info(path, result_json):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(result_json, file, indent=4, ensure_ascii=False)

    print(f"Stored → {path}")


def perform_google_API_text_search(textQuery, latitude, longitude, radius, pageSize=10, nextPageToken=""):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK + ",nextPageToken",
    }

    data = {
        "textQuery": textQuery,
        "pageSize": pageSize,
        "locationBias": {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": radius,
            }
        },
    }

    if nextPageToken:
        data["pageToken"] = nextPageToken

    response = requests.post(
        url=GOOGLE_PLACES_TEXT_SEARCH_API_URL,
        headers=headers,
        data=json.dumps(data),
    )

    if response.status_code == 200:
        return response.json()

    logging.warning(f"API error {response.status_code}: {response.text}")
    return {}


def _filename_from_photo_name(photo_name: str) -> str:
    return hashlib.sha256(photo_name.encode("utf-8")).hexdigest() + ".jpg"


def fetch_and_store_photo(photo_name: str, output_dir="places_photos", max_width=800):
    os.makedirs(output_dir, exist_ok=True)

    filename = _filename_from_photo_name(photo_name)
    filepath = os.path.join(output_dir, filename)

    if os.path.exists(filepath):
        return filepath

    api_url = f"{GOOGLE_PLACES_PHOTOS_SEARCH_API_URL}/{photo_name}/media"

    params = {
        "key": GOOGLE_API_KEY,
        "maxWidthPx": max_width,
        "skipHttpRedirect": "true",
    }

    try:
        meta = requests.get(api_url, params=params, timeout=10)
        meta.raise_for_status()

        photo_uri = meta.json().get("photoUri")
        if not photo_uri:
            return None

        img = requests.get(photo_uri, timeout=15)
        img.raise_for_status()

        with open(filepath, "wb") as f:
            f.write(img.content)

        return filepath

    except Exception as e:
        logging.warning(f"[Photo] Failed {photo_name}: {e}")
        return None


def filter_only_quality_photos(place_data, max_photos_allowed=5):
    place_name = place_data["displayName"]["text"]

    authored = [p for p in place_data["photos"]
                if p["authorAttributions"][0]["displayName"] == place_name]

    others = [p for p in place_data["photos"]
            if p["authorAttributions"][0]["displayName"] != place_name]

    result = authored[:max_photos_allowed]

    if len(result) < max_photos_allowed:
        result.extend(others[:max_photos_allowed - len(result)])

    place_data["photos"] = result[:max_photos_allowed]


def aggregate_places_photos_data(places_api_response_json):
    max_workers = 5
    places = places_api_response_json.get("places", [])

    for place_data in tqdm(places, desc="Photos"):
        if "photos" not in place_data:
            continue

        filter_only_quality_photos(place_data)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(fetch_and_store_photo, p["name"]): p
                for p in place_data["photos"]
            }

        for future in as_completed(futures):
            photo_meta = futures[future]
            try:
                local_path = future.result()
                if local_path:
                    photo_meta["localPath"] = local_path
            except Exception as e:
                logging.warning(f"[Photo] Error: {e}")


def aggregate_all_places_data(result_data_list: Dict):
    visited = set()
    final = {"places": []}

    for places in result_data_list.values():
        for place in places.get("places", []):
            if place["id"] not in visited:
                visited.add(place["id"])
                final["places"].append(place)

    return final


def main():
    global GOOGLE_API_KEY

    args = parse_args()

    GOOGLE_API_KEY = args.api_key or os.getenv("GOOGLE_API_KEY")

    if not GOOGLE_API_KEY:
        raise ValueError(
            "Google API key missing. Use --api-key or set GOOGLE_API_KEY env variable."
        )

    keywords = load_keywords(args.keywords_file)

    os.makedirs(args.output_dir, exist_ok=True)

    # ✅ TMP DIR
    tmp_dir = os.path.join(args.output_dir, "tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    result_json_data = {}

    for keyword in keywords:
        print(f"\n🔍 {keyword}")

        places_result = {"places": []}
        page_result = {}

        for _ in range(args.pages):
            if not page_result:
                page_result = perform_google_API_text_search(
                    keyword, args.lat, args.lng, args.radius, args.page_size
                )
            elif "nextPageToken" in page_result:
                page_result = perform_google_API_text_search(
                    keyword,
                    args.lat,
                    args.lng,
                    args.radius,
                    args.page_size,
                    page_result["nextPageToken"],
                )
            else:
                break

            if "places" not in page_result:
                continue

            places_result["places"].extend(page_result["places"])

        print(f"Found: {len(places_result['places'])}")

        if args.download_photos:
            aggregate_places_photos_data(places_result)

        result_json_data[keyword] = places_result

        # store partial tmp files by the keyword
        store_api_restaurants_info(
            os.path.join(tmp_dir, f"{keyword}.json"),
            places_result,
        )

    aggregated = aggregate_all_places_data(result_json_data)

    # store final output file
    store_api_restaurants_info(
        os.path.join(args.output_dir, "all_places.json"),
        aggregated,
    )


if __name__ == "__main__":
    main()