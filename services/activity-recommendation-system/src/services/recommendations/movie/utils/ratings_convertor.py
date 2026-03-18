import pandas as pd


class MovieRatingsConvertor():

    @staticmethod
    def normalize_rating_row(row, star_min: float = 1.0, star_max: float = 5.0) -> float:
        """
        Normalize rating values for a single row.
        Prefers `rating` (app like/neutral/dislike), otherwise uses `star_rating` (Google-style 1-5 stars).
        If none is present returns (star_min + star_max)/2.
        """
        val = MovieRatingsConvertor.normalize_app_rating(row.get("rating"), star_min, star_max)
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