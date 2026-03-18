from datetime import datetime
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
from src.database.models import GpsLocation
from src.database.restaurant_database import RestaurantSearchParams, search_for_similar_restaurants_in_radius

class CbRecommendationRestrictions:
    def __init__(self, search_center: GpsLocation,
                search_radius: float,
                excluded_items: List[int],
                is_vegetarian: bool,
                max_price: int
                ):
        self.search_center = search_center
        self.search_radius = search_radius
        self.excluded_items = excluded_items
        self.is_vegetarian = is_vegetarian
        self.max_price = max_price

class RestaurantCbModel():

    def get_all_recommendation_by_external_profile(self, profile: np.ndarray, recommendation_restrictions: CbRecommendationRestrictions) -> pd.DataFrame:
        df = search_for_similar_restaurants_in_radius(profile.tolist(),
                                            RestaurantSearchParams(
                                                recommendation_restrictions.search_center,
                                                recommendation_restrictions.search_radius,
                                                recommendation_restrictions.excluded_items,
                                                recommendation_restrictions.is_vegetarian,
                                                recommendation_restrictions.max_price
                                            ))

        df["score"] = 1.0 / (1.0 + df["similarity"]) # we have to convert the distance to score (smaller is better)
        df = df.sort_values("score", ascending=False).reset_index(drop=True) # make sure they are sorted
        df.set_index("id")

        return df