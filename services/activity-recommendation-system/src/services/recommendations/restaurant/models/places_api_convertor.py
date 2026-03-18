import logging
import numpy as np
from typing import Dict, List

from src.domain.representation import (
    CATEGORY_ORDER,
    PRICE_LEVELS,
    RESTAURANT_GOOGLE_TYPES_GROUPS,
    GOOGLE_TYPE_TO_GROUP_MAPPING,
)

class PlacesAPI2RepConvertor:
    @staticmethod
    def get_recommender_categories_order():
        return CATEGORY_ORDER

    @staticmethod
    def get_price_levels():
        return PRICE_LEVELS

    @staticmethod
    def get_vector_dim() -> int:
        return len(PlacesAPI2RepConvertor.get_representation_names())

    @staticmethod
    def price_level_to_number(price_level: str):
        if price_level not in PRICE_LEVELS:
            return 0
        return PRICE_LEVELS.index(price_level)

    @staticmethod
    def get_restaurant_type_vector(restaurant_types):

        type_vector = np.zeros(len(RESTAURANT_GOOGLE_TYPES_GROUPS))
        group_options = list(RESTAURANT_GOOGLE_TYPES_GROUPS.keys())

        for type in restaurant_types:
            if type in GOOGLE_TYPE_TO_GROUP_MAPPING:
                group_index = group_options.index(GOOGLE_TYPE_TO_GROUP_MAPPING[type])
                type_vector[group_index] = 1
        return type_vector

    @staticmethod
    def get_representation_names():
        return list(RESTAURANT_GOOGLE_TYPES_GROUPS.keys()) + ["rating", "price_level"]

    @staticmethod
    def places_api_data_to_vector(place_data: Dict) -> List[float]:
        restaurant_types = place_data.get("types", [])
        rating = float(place_data.get("rating", 0)) / 5

        price_level = float(PlacesAPI2RepConvertor.price_level_to_number(place_data.get("priceLevel"))) / len(PRICE_LEVELS)

        type_vector = PlacesAPI2RepConvertor.get_restaurant_type_vector(restaurant_types)

        numeric_vector = np.array([rating, price_level])

        return np.concatenate([type_vector, numeric_vector]).tolist()

    @staticmethod
    def restaurant_types_to_canonical(rest_types_mapping: Dict[str, int]) -> List[float]:
        """ Creates one-hot encoded vector from the types mapping "type_name" => 0/1. Other features sets to zero. """

        included_types = [cat for cat, val in rest_types_mapping.items() if val == 1]

        type_vector = np.zeros(len(RESTAURANT_GOOGLE_TYPES_GROUPS))

        for type in included_types:
            if type not in CATEGORY_ORDER:
                logging.debug(f"⚠️ Unknown restaurant type '{type}', skipping.")
                continue
            group_index = CATEGORY_ORDER.index(type)
            type_vector[group_index] = 1

        numeric_vector = np.array([0, 0]) # set other dimensions to zero

        return np.concatenate([type_vector, numeric_vector]).tolist()