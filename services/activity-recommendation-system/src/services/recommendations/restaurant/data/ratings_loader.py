import logging
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix

from src.database.restaurant_database import fetch_restaurant_ratings

class RestaurantDbRatingsLoader():

    def load_ratings(self):
        """ Loads ratings about all places in the database."""
        ratings = fetch_restaurant_ratings()
        return self._convert_ratings_to_csr(ratings)

    def _convert_ratings_to_csr(
        self,
        df: pd.DataFrame,
        star_min: float = 1.0,
        star_max: float = 5.0
    ):
        """
            Convert raw ratings DataFrame into CSR matrix with normalized stars.
            Prefers `rating` if present, otherwise falls back to `star_rating`.

            Args:
                df: DataFrame with columns [user_id, restaurant_id, rating, star_rating]
            Returns:
                ratings_csr, user_id_map, item_id_map
        """
        midpoint = 0.5 * (star_min + star_max)

        df["star_rating"] = df.apply(
            lambda row: self.normalize_rating_row(row, star_min, star_max),
            axis=1
        )

        # --- build maps ---
        unique_users = {uid: i for i, uid in enumerate(df["user_uuid"].unique())}
        unique_items = {iid: i for i, iid in enumerate(df["restaurant_id"].unique())}
        user_id_map = {i: uid for uid, i in unique_users.items()}
        item_id_map = {i: iid for iid, i in unique_items.items()}

        # --- build CSR ---
        rows = df["user_uuid"].map(unique_users).to_numpy()
        cols = df["restaurant_id"].map(unique_items).to_numpy()
        data = df["star_rating"].to_numpy(dtype=np.float32)

        ratings_csr = csr_matrix(
            (data, (rows, cols)),
            shape=(len(unique_users), len(unique_items))
        )

        return ratings_csr, user_id_map, item_id_map

    @staticmethod
    def normalize_rating_row(row, star_min: float = 1.0, star_max: float = 5.0) -> float:
        """
        Normalize rating values for a single row.
        Prefers `rating` (app like/neutral/dislike), otherwise uses `star_rating` (Google-style 1-5 stars).
        If none is present returns (star_min + star_max)/2.
        """
        val = RestaurantDbRatingsLoader.normalize_app_rating(row.get("rating"), star_min, star_max)
        if val is not None:
            return val

        return float(row.get("star_rating", (star_min + star_max)/2))

    @staticmethod
    def normalize_app_rating(value: float | None, star_min: float = 1.0, star_max: float = 5.0) -> float | None:
        """Normalize app like/dislike rating (-1, 0, 1) into star scale."""
        if pd.isnull(value):
            return None

        midpoint = 0.5 * (star_min + star_max)
        if value > 0:
            return star_max
        elif value < 0:
            return star_min
        else:
            return midpoint