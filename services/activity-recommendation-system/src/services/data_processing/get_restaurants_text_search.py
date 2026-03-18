#!/bin/python3
from requests import Response
from typing import Dict, List
import requests
import json


GOOGLE_PLACES_TEXT_SEARCH_API_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_PLACES_NEARBY_SEARCH_API_URL="https://places.googleapis.com/v1/places:searchNearby"
GOOGLE_PLACES_PHOTOS_SEARCH_API_URL = "https://places.googleapis.com/v1"
GOOGLE_API_KEY = "" # has to have (new) places activated in the GCP console


# specifies which data to return from the API
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


def store_api_restaurants_info(db_file_name, result_json):
    with open(db_file_name, 'w', encoding='utf-8') as file:
        json.dump(result_json, file, indent=4, ensure_ascii=False)

    print(f"Places data stored to {db_file_name}")


def fetch_places_nearby_search_API(searchIncludedTypes: List[str], latitude, longitude, radius, pageSize = 10, nextPageToken = ""):
    """
        Searches for places based on the searchIncludedTypes using Google Nearby search API (New).
        Search is performed approximately within the circle with center defined
        by latitude, longitude and radius.
    """

    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': GOOGLE_FIELD_MASK
    }

    #headers['X-Goog-FieldMask'] += ",nextPageToken" # we also want to retrieve next page token

    data = {
        'includedTypes': searchIncludedTypes,
        'maxResultCount': pageSize,
        'locationRestriction': {
            'circle': { # we search in the circle around the location
                'center': {"latitude": float(latitude), "longitude": float(longitude)},
                'radius': float(radius)
            }
        }
    }

    if nextPageToken != "":
        data['pageToken'] = nextPageToken

    response = requests.post(url=GOOGLE_PLACES_NEARBY_SEARCH_API_URL, headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Api returned: {response.status_code}")
        print(f"Api returned: {response.json()}")

    return {}

def fetch_places_text_search_API(textQuery, latitude, longitude, radius, pageSize = 10, nextPageToken = ""):
    """
        Searches for places based on the textQuery using Google Text search API (New).
        Search is performed approximately within the circle with center defined
        by latitude, longitude and radius.

        pageSize - number of results to obtain, max 20
        nextPageToken - returns nextPageToken
    """

    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': GOOGLE_FIELD_MASK
    }

    headers['X-Goog-FieldMask'] += ",nextPageToken" # we also want to retrieve next page token

    data = {
        'textQuery': textQuery,
        'pageSize': pageSize,
        'locationBias': {
            'circle': { # we search in the circle around the location
                'center': {"latitude": latitude, "longitude": longitude},
                'radius': radius
            }
        }
    }

    if nextPageToken != "":
        data['pageToken'] = nextPageToken

    response = requests.post(url=GOOGLE_PLACES_TEXT_SEARCH_API_URL, headers=headers, data=json.dumps(data))

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Api returned: {response.status_code}")

    return {}


def fetch_photo_data(place_photo_name, photo_max_width = 800):
    """
        Fetches information's about the photos from the google API by the photos name.
    """

    headers = {
        'X-Goog-Api-Key': GOOGLE_API_KEY
    }

    params = {
        'maxWidthPx': photo_max_width,  # Your query
        'key': GOOGLE_API_KEY,  # api key must be added to both
        'skipHttpRedirect': 'true'
    }

    request_url = f"{GOOGLE_PLACES_PHOTOS_SEARCH_API_URL}/{place_photo_name}/media"

    response: Response = requests.get(url=request_url, headers=headers, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Photos api: {response.status_code}")
        return {}


def filter_only_quality_photos(place_data, max_photos_allowed = 5):
    """
        Filter only photos that were added by the place owner.

        max_photos_allowed - how many photos we want to have left in the final data structure
    """

    place_name = place_data['displayName']['text']

    filtered_phots = []
    authored_photos = list(filter(lambda photo: photo['authorAttributions'][0]['displayName'] == place_name, place_data['photos']))
    non_authored_photos = list(filter(lambda photo: photo['authorAttributions'][0]['displayName'] != place_name, place_data['photos']))

    filtered_phots.extend(authored_photos) # we append authored photos to the final list

    # there are no owners photos => choose random 5
    if (len(authored_photos) <= max_photos_allowed):
        missing_photos_count = max(max_photos_allowed, abs(max_photos_allowed - len(authored_photos)))
        non_authored_photos_selected = non_authored_photos[:missing_photos_count] # we take missing photos from the users photos
        filtered_phots.extend(non_authored_photos_selected)


    place_data['photos'] = filtered_phots[:max_photos_allowed] # make sure we have at most allowed number of photos


def aggregate_places_photos_data(places_api_response_json):

    max_photos_to_process_limit = 3 # limit the number of photos we can process

    number_of_places = len(places_api_response_json['places'])

    for i, place_data in enumerate(places_api_response_json['places']):

        if (i % 5 == 0):
            print(f"Processed {round(i/number_of_places, 3) * 100}% all places photos")

        if not 'photos' in place_data.keys():
            continue

        place_data['photos'] = place_data['photos'][:max_photos_to_process_limit] # we take only the top photos

        filter_only_quality_photos(place_data, max_photos_to_process_limit)

        for photo_meta in place_data['photos']:

            photo_name = photo_meta['name'] # just internal api temporary name...
            real_photo_data = fetch_photo_data(photo_name) # we will fix the photo width to some reasonable size for the screen device

            if real_photo_data != {}:
                photo_meta['url'] = real_photo_data['photoUri']


def aggregate_all_places_data(result_data_list: Dict):
    """
        Aggregates all the resulting API places data into a single collection.
    """

    visited_places_ids = set()

    final_places_list = {
        "places": []
    }

    for key, places in result_data_list.items():
        if not places["places"]:
            continue

        for place in places["places"]:
            if place['id'] in visited_places_ids:
                continue

            visited_places_ids.add(place['id'])
            final_places_list['places'].append(place)


    return final_places_list



if __name__ == "__main__":

    ## Prague location
    latitude = "50.08804"
    longitude = "14.42076"
    radius = "12000.0" # in meters

    page_search_count = 20
    page_size = 20

    search_keywords = [
                    'restaurant',
                    'donut_shop',
                    'bakery',
                    'fast_food_restaurant',
                    'breakfast_restaurant',
                    'chocolate_factory',
                    'hamburger_restaurant',
                    'brunch_restaurant',
                    'dog_cafe',
                    'japanese_restaurant',
                    'dessert_restaurant',
                    'juice_shop',
                    'diner',
                    'sushi_restaurant',
                    'italian_restaurant',
                    'pub',
                    'meal_delivery',
                    'bar_and_grill',
                    'chinese_restaurant',
                    'vegan_restaurant',
                    'mediterranean_restaurant',
                    'dessert_shop',
                    'wine_bar',
                    'american_restaurant',
                    'vegetarian_restaurant',
                    'thai_restaurant',
                    'chocolate_shop',
                    'barbecue_restaurant',
                    'bagel_shop',
                    'asian_restaurant',
                    'bar',
                    'confectionery',
                    'indonesian_restaurant',
                    'lebanese_restaurant',
                    'sandwich_shop',
                    'african_restaurant',
                    'spanish_restaurant',
                    'turkish_restaurant',
                    'wine_bardeli',
                    'vietnamese_restaurant',
                    'ramen_restaurant',
                    'steak_house',
                    'cafe',
                    'buffet_restaurant',
                    'fine_dining_restaurant',
                    'cat_cafe',
                    'korean_restaurant',
                    'deli',
                    'restaurant',
                    'tea_house',
                    'brazilian_restaurant',
                    'indian_restaurant',
                    'mexican_restaurant',
                    'pizza_restaurant',
                    'afghani_restaurant',
                    'middle_eastern_restaurant',
                    'greek_restaurant',
                    'ice_cream_shop',
                    'cafeteria',
                    'food_court',
                    'french_restaurant',
                    'seafood_restaurant'
                ]

    # "restaurace", "jídelna", "kavárna", "čajovna", "klub", "hospoda", "fastfood", "jídlo"

    result_json_data = {}

    for i, key_word in enumerate(search_keywords):

        print(f"getting data for: {key_word}")

        places_result = { 'places': [] }
        page_result = {}
        for page_index in range(0, page_search_count):
            print(f"Listing page {page_index}")

            if page_result == {}:
                #page_result = perform_google_API_search_text(key_word, latitude, longitude, radius)
                page_result = fetch_places_nearby_search_API([key_word], latitude, longitude, radius)
            #elif 'nextPageToken' in page_result:
                #page_result = perform_google_API_nearby_search([key_word], latitude, longitude, radius, pageSize=20, nextPageToken=page_result['nextPageToken'])
                #page_result = perform_google_API_search_text(key_word, latitude, longitude, radius, pageSize=20, nextPageToken=page_result['nextPageToken'])
            else:
                break

            if ('places' not in page_result):
                print(f"Found 0 places of key_word {key_word}:")
                continue

            places_result['places'].extend(page_result['places'])


        print(f"Found {len(places_result['places'])} of places of key_word {key_word}:")
        print(f"Processing photos for {key_word}:")
        aggregate_places_photos_data(places_result) # find urls to all the images

        print(f"Number of {key_word} found: {len(places_result['places'])}")

        result_json_data[key_word] = places_result

        store_api_restaurants_info(f"data_{key_word}.json", places_result)

    aggregated_list_of_places = aggregate_all_places_data(result_json_data)

    store_api_restaurants_info(f"all_places.json", aggregated_list_of_places)
