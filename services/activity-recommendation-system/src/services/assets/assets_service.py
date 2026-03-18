from src.controllers.DTOs.movie_dtos import MovieCardDTO
import src.database.restaurant_database as db

from typing import Dict, List, Optional

from src.controllers.DTOs.restaurant_dtos import AuthorAttribution, GpsCoordinates, OpeningDay, OpeningHours, PlacePhoto, PlaceReview, RestaurantCardData
from src.domain.movie_card import MovieCard
from src.domain.representation import DAY_NAMES
from src.services.gateways.google_places_api_gateway import PlacesPhotoGateway
from src.services.gateways.movie_data_gateway import (
    TMDBGateway, movielens_ids_to_tmdb_ids)


class AssetsDataService:

    def __init__(self, tmdb_gateway: TMDBGateway, places_gateway: PlacesPhotoGateway):
        self.movies_gateway = tmdb_gateway
        self.places_photos_gateway = places_gateway

    def get_movie_cards_data(self, movie_ids) -> Dict[int, RestaurantCardData]:

        tmdb_ids = movielens_ids_to_tmdb_ids(movie_ids)

        movie_cards: List[MovieCard] = self.movies_gateway.get_movies_details(tmdb_ids)

        dtos = { card.cardId: MovieCardDTO.from_domain(card) for card in movie_cards }

        return dtos

    def get_restaurant_cards_data(self, restaurant_ids, photos_cache_base_url) -> Dict[int, RestaurantCardData]:

        def build_public_photo_url(photo_path: Optional[str], base_url: str) -> Optional[str]:
            if not photo_path:
                return None

            if photo_path.startswith("http"):
                # GCS / external
                return photo_path

            # local static
            return base_url + photo_path

        restaurants_df = db.fetch_restaurants_data_by_ids(restaurant_ids)
        restaurant_cards = {}
        for _, row in restaurants_df.iterrows():
            record = row["data"]
            rest_data = RestaurantCardData(
                cardId=row["id"],
                restaurantId=row["id"],
                placeUrl=record.get("googleMapsUri", ""),
                title=record.get("displayName", {}).get("text", ""),
                placePhotos=[
                    PlacePhoto(
                        url=build_public_photo_url(self.places_photos_gateway.get_photo_url(photo.get("name", "")), photos_cache_base_url),
                        name=photo.get("name", ""),
                        authorAttributions=AuthorAttribution(
                            displayName=photo.get("authorAttributions", [{}])[0].get("displayName", ""),
                            photoUri=photo.get("authorAttributions", [{}])[0].get("photoUri", ""),
                            uri=photo.get("authorAttributions", [{}])[0].get("uri", "")
                        )
                    )
                    for photo in record.get("photos", [])
                ],
                locationAddress=record.get("formattedAddress", ""),
                location=GpsCoordinates(
                    long=record.get("location", {}).get("longitude"),
                    lat=record.get("location", {}).get("latitude")
                ),
                type=record.get("types", []),
                rating=record.get("rating", 0),
                takeout=record.get("takeout", False),
                delivery=record.get("delivery", False),
                outdoorSeating=record.get("outdoorSeating", False),
                goodForGroups=record.get("goodForGroups", False),
                servesVegetarian=record.get("servesVegetarianFood", False),
                priceLevel=[
                    "PRICE_LEVEL_UNSPECIFIED",
                    "PRICE_LEVEL_FREE",
                    "PRICE_LEVEL_INEXPENSIVE",
                    "PRICE_LEVEL_MODERATE",
                    "PRICE_LEVEL_EXPENSIVE",
                    "PRICE_LEVEL_VERY_EXPENSIVE"
                ].index(record.get("priceLevel", "PRICE_LEVEL_MODERATE")),
                placeReviews=[
                    PlaceReview(
                        name=review.get("name", ""),
                        rating=review.get("rating", 0),
                        text=review.get("text", {}).get("text", ""),
                        publishTime=review.get("publishTime", ""),
                        authorAttribution=AuthorAttribution(
                            displayName=review.get("authorAttribution", {}).get("displayName", ""),
                            photoUri=review.get("authorAttribution", {}).get("photoUri", ""),
                            uri=review.get("authorAttribution", {}).get("uri", "")
                        )
                    )
                    for review in record.get("reviews", [])
                ],
                openingHours=self.parse_opening_hours(record.get("regularOpeningHours", None))
            )
            restaurant_cards[rest_data.cardId] = rest_data

        return restaurant_cards

    def parse_opening_hours(self, regular):
        if not regular:
                return None

        periods = regular.get("periods", [])
        next_open = regular.get("nextOpenTime")

        days = {i: None for i in range(7)}  # 0 = Sunday … 6 = Saturday

        for p in periods:
            day = p["open"]["day"]
            open_t = f'{p["open"]["hour"]:02d}:{p["open"]["minute"]:02d}'
            close_t = f'{p["close"]["hour"]:02d}:{p["close"]["minute"]:02d}'

            days[day] = OpeningDay(
                day=day,
                dayName=DAY_NAMES[day],
                openTime=open_t,
                closeTime=close_t,
            )

        week = [
            val if val is not None else OpeningDay(
                day=day,
                dayName=DAY_NAMES[day],
                openTime=None,
                closeTime=None,
            )
            for day, val in days.items()
        ]

        return OpeningHours(
            nextOpenTime=next_open,
            week=week
        )