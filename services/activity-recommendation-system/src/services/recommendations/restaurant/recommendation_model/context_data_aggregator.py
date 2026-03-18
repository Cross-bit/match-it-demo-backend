from collections import Counter
import os
import json
from pathlib import Path
import uuid
import pandas as pd
import numpy as np
import logging
import json

from abc import ABC, abstractmethod
from typing import Dict, List, Tuple
from src.database.models import GpsLocation, Restaurant
from src.services.recommendations.restaurant.models.places_api_convertor import PlacesAPI2RepConvertor
import src.database.restaurant_database as db

# ===========================
# DESCRIPTION
# ===========================
# RecommendationContextAggregator:
#   --> Loads contextual data important for restaurants recommender.
#   --> Two versions a) from local JsonFile (good for testing) b) from GooglePlacesAPI
#

class RecommendationContextAggregator(ABC):
    """
        Abstract base class for collecting and assembling all contextual
        data required to generate recommendations.
    """

    def check_data_in_database(self, location: GpsLocation, min_number_of_records: int = 100, radius: int = 1500) -> bool:
        """
        Check's presents and actuality of the data in the database for given parameters.

        Parameters:
        -----------
        location : GpsLocation
            The geographical location for which restaurant data availability is checked.
        min_number_of_records : int, optional (default=100)
            The minimum number of records required for the data to be considered sufficient.
        radius : int, optional (default=1500)
            The radius in which the results should be retrieved from.

        Returns:
        --------
        bool
            True if the required data is available, otherwise False.
        """
        self._suma = 0
        valid_restaurants_count = db.count_restaurants_in_radius(location, radius)
        logging.info(f"Found {valid_restaurants_count} restaurants within {radius}m.")
        return valid_restaurants_count >= min_number_of_records

    @abstractmethod
    def fetch_data_from_original_source(self, force_fetch: bool, location: GpsLocation, radius: int = 1500):
        """ Fetches context data from the source to the database."""
        pass

class RestaurantDataAggregatorPlacesAPI(RecommendationContextAggregator):

    def fetch_data_from_original_source(self, force_fetch: bool, location: GpsLocation, radius: int = 1500):
        """
            Fetches data from places api.
        """
        pass

class RestaurantContextAggregatorJsonFile(RecommendationContextAggregator):

    def __init__(self, min_number_of_records_in_source: int = 20, db_file: str = "", min_number_of_records_in_local: int = 100, radius: int = 1500):
        self.min_number_of_records_in_source = min_number_of_records_in_source
        self.min_number_of_records_in_local = min_number_of_records_in_local
        self.db_file = self._ensure_db_file_path(db_file)
        self.radius = radius

        self._suma = 0

        self._restaurants_fake_user_ids: Dict = {}

        self.price_level_backup = 3 # if price level tag is missing -- we put middle of the scale...

    def _ensure_db_file_path(self, db_file: str):
        if db_file is None or db_file == "":
            ROOT = Path(__file__).resolve().parent
            return (ROOT / "../../../datasets/restaurants/placesData/all_places.json").resolve()

        return db_file

    def check_data_in_database(self, location: GpsLocation, min_number_of_records: int = 100, radius: int = 1500) -> bool:
        """
            Internal helper to check if there are enough restaurants in the area.
        """
        valid_restaurants_count = db.count_restaurants_in_radius(location, radius)
        logging.info(f"Found {valid_restaurants_count} restaurants within {radius}m.")
        return valid_restaurants_count >= min_number_of_records


    def fetch_data_from_original_source(self, location: GpsLocation = None, radius: int = 1500, force_fetch = False) -> bool:
        """
            Fetches data from local prefetched db file to the database.
            location, radius -- Are ignored, We are loading all the data from the file.
            force_fetch -- Ignores any already fetched data and tries it anyway.
            Returns: boolean if sufficient amount of data were found.
        """

        logging.info("Fetching restaurants data from local JSON file")

        logging.info(f"{ '(force fetching)' if force_fetch else '' } Fetching data from the source file {self.db_file}")

        restaurants_with_reviews = self._load_restaurant_data_from_file(self.db_file)
        restaurants = [r[0] for r in restaurants_with_reviews]
        #reviews = [r[1] for r in restaurants_with_reviews]

        if len(restaurants_with_reviews) <= self.min_number_of_records_in_source:
            logging.warning(f"Not sufficient amount of data in the remote data source found.")
            return False
        else:
            new_record_ids = db.update_restaurant_places_data(restaurants)
            user_restaurant_ratings_list = self._combine_user_ratings_with_restaurant_ids(restaurants_with_reviews, new_record_ids)
            db.insert_restaurant_user_ratings(user_restaurant_ratings_list)
            return True


    def _combine_user_ratings_with_restaurant_ids(self, restaurant_ratings, restaurant_ids: List[int]):
        user_restaurant_ratings_list: List[Tuple[str, int, int, int]] = []

        logging.info(f"Got {len(restaurant_ids)} restaurant IDs")

        for (restaurant, ratings), restaurant_id in zip(restaurant_ratings, restaurant_ids):
            for user_id, star_rating in ratings:
                user_restaurant_ratings_list.append((str(user_id), restaurant_id, None, star_rating))

        # remove possible duplicates ...
        user_restaurant_ratings_list = list({(u, r): (u, r, n, s) for (u, r, n, s) in user_restaurant_ratings_list}.values())

        logging.info(f"Combined {len(user_restaurant_ratings_list)} unique user–restaurant ratings")

        return user_restaurant_ratings_list

    def _load_restaurant_data_from_file(self, file_path) -> List[Tuple[Restaurant, List[Tuple[uuid.UUID, int]]]]:

        restaurant_data_api = {}

        try:
            logging.info("Reading restaurants file")
            with open(file_path, 'r') as file:
                restaurant_data_api = json.load(file)
        except json.JSONDecodeError as e:
            logging.error(f"Invalid JSON: {e}")
            restaurant_data_api = []

        restaurants_and_reviews: List = []
        fake_user_uuids_map = {}

        for restaurant_raw in restaurant_data_api.get("places", []):

            # convert restaurant
            price_level = PlacesAPI2RepConvertor.price_level_to_number(restaurant_raw.get("priceLevel", self.price_level_backup))
            place_id = restaurant_raw.get("id", None)
            serves_vegetarian = restaurant_raw.get("servesVegetarianFood", False)
            location = restaurant_raw.get("location", None)
            lat = location.get("latitude", 0.0)
            lng = location.get("longitude", 0.0)
            representation_vec = PlacesAPI2RepConvertor.places_api_data_to_vector(restaurant_raw)
            #logging.info(len(representation_vec))
            if not place_id or not location or not representation_vec:
                logging.info(f"Skipping restaurant {place_id}")
                continue

            restaurant_reviews = self._generate_restaurant_users_ratings(restaurant_raw, fake_user_uuids_map)

            restaurants_and_reviews.append((
                Restaurant(
                    place_id,
                    json.dumps(restaurant_raw),
                    price_level,
                    serves_vegetarian,
                    lat,
                    lng,
                    representation_vec,
                ),
                restaurant_reviews
                )
            )

        return restaurants_and_reviews

    def _generate_restaurant_users_ratings(
        self,
        restaurant_raw,
        user_map: dict[str, uuid.UUID]
    ) -> list[tuple[uuid.UUID, int]]:
        data = []
        for review in restaurant_raw.get("reviews", []):
            author_name = review.get("authorAttribution", {}).get("displayName")
            if not author_name:
                continue
            if author_name not in user_map:
                user_map[author_name] = uuid.uuid4()
            fake_user_id = user_map[author_name]
            rating = review.get("rating")
            if rating is not None:
                data.append((fake_user_id, rating))
        return data