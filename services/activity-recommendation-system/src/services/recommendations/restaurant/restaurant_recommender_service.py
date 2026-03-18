from collections import defaultdict
from src.domain.session_parameters import AlgorithmType
from datetime import datetime
import logging
import threading
from typing import Dict, List, Optional, Tuple
from src.controllers.DTOs.matching_session_dtos import MatchingSessionInfoDTO, NextRecommendationItem, RecommendationUpdateDTO
from src.controllers.DTOs.restaurant_dtos import AuthorAttribution, GpsCoordinates, OpeningDay, OpeningHours, PlacePhoto, PlaceReview, RestaurantCardData
from src.database.models import UserVotes
import src.database.restaurant_database as db
from src.domain.representation import DAY_NAMES
from src.services.gateways.google_places_api_gateway import PlacesPhotoGateway
from src.services.recommendations.algorithms.async_algorithm.models import Vote
from src.services.recommendations.algorithms.interface import RecAlgoFull
from src.services.recommendations.restaurant.models.cb_model import RestaurantCbModel
from src.services.recommendations.restaurant.models.session_record import RestaurantSessionRecord


class RestaurantRecommenderService:
    """
        Provides interface for restaurant recommendations.
        Intended as the main API to be called from the restaurant controllers.
    """

    def __init__(self,
                cf_model: RecAlgoFull,
                cb_model: RestaurantCbModel,
                places_gateway: PlacesPhotoGateway,
                recommendation_size: int):

        self._session_records: Dict[str, RestaurantSessionRecord] = {}
        self._session_locks = defaultdict(threading.Lock)

        self._recommendation_size = recommendation_size
        self._cf_model = cf_model
        self._cb_model = cb_model
        self._places_gateway = places_gateway

    def recommend_next(self, update_dto: RecommendationUpdateDTO) -> Dict[str, List[Tuple[int, float]]]:
        """ Updates model with last users votes and returns new top k group recommendations for current users.
        Args:
            group (List[int]): List of user ids to recommend to.
            context (RestaurantContext): Restaurant context.
            exclude_items (List[int]): Items to exclude from recommendation.
        """

        session = update_dto.session
        session_id = session.sessionUUID
        members_ids = [m.userUUID for m in session.members]

        lock = self._session_locks[session_id]

        with lock: # same session one at the time!
            self._ensure_session_initialized(session)

            session = self._session_records[session_id]

            session.update_group_data(update_dto)
            self._update_users_votes_in_db(update_dto)

            gr_recommender = session.rec_model
            next_recommendation = gr_recommender

            session_votes = self.map_users_voting_results(update_dto.usersVotingResults)

            next_recommendation = gr_recommender.get_next_round_recommendation(session_votes, list(session.all_voted_items))

            return next_recommendation

    def clearsession(self, sessionId: str):
        self._session_records.pop(sessionId, None)

    def get_recommendation_dtos(
        self,
        recommendations: Dict[str, List[Tuple[int, float]]],
        photos_cache_base_url: str
    ) -> Dict[str, List[NextRecommendationItem]]:

        result: Dict[str, List[NextRecommendationItem]] = {}

        all_ids = list({item_id for recs in recommendations.values() for item_id, _ in recs})
        cards = self._get_cards_data(all_ids, photos_cache_base_url)

        for user_id, user_recs in recommendations.items():
            result[user_id] = [
                NextRecommendationItem(item_id, score, cards[item_id])
                for item_id, score in user_recs
                if item_id in cards
            ]

        return result

    def _ensure_session_initialized(self, session: MatchingSessionInfoDTO):
        session_id = session.sessionUUID

        if session_id not in self._session_records:
            self._init_new_session_recommendation(session)

    def _init_new_session_recommendation(self, session: MatchingSessionInfoDTO):

        session_id = session.sessionUUID
        session_users_ids = [user.userUUID for user in session.members]

        algo_type = self._get_algo_type(session)
        logging.info(f"ALGO TYPEEE: {algo_type}")

        self._session_records[session_id] = RestaurantSessionRecord.create(session_id,
                                                                            session_users_ids,
                                                                            self._cf_model,
                                                                            self._cb_model,
                                                                            self._recommendation_size,
                                                                            algo_type)

    def _get_algo_type(self, session: MatchingSessionInfoDTO) -> AlgorithmType:


        logging.info("Resolving algorithm type")

        for member in session.members:
            logging.info(member.model_dump())
            if member.isCreator:
                metadata = member.metadata
                if not metadata:
                    continue

                params = metadata.sessionParameters
                if not params:
                    continue

                algo_value = params.get("algorithm", "NONE")

                try:
                    algo_type = AlgorithmType(algo_value)
                except ValueError:
                    logging.warning(f"Unknown algorithm type: {algo_value}")
                    return AlgorithmType.NONE

                if algo_type != AlgorithmType.NONE:
                    logging.info(f"Selected algorithm: {algo_type}")
                    return algo_type


        logging.info("No algorithm specified, using NONE")
        return AlgorithmType.NONE

    def _update_users_votes_in_db(self, update_data: RecommendationUpdateDTO):
        """
            Update movies votes in persistent layer.
        """
        ratings = [
            db.RestaurantRating(
                user_uuid=user.userUUID,
                item_id=int(vote.itemId),
                rating=vote.rating
            )
            for user in update_data.usersVotingResults
            for vote in user.votingResult
        ]

        db.save_restaurant_ratings(ratings)
        logging.info(f"All members updated for session")

    def _get_cards_data(self, restaurant_ids, photos_cache_base_url) -> Dict[int, RestaurantCardData]:

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
                        url=build_public_photo_url(self._places_gateway.get_photo_url(photo.get("name", "")), photos_cache_base_url),
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
                openingHours=self._parse_opening_hours(record.get("regularOpeningHours", None))
            )
            restaurant_cards[rest_data.cardId] = rest_data

        return restaurant_cards

    def _parse_opening_hours(self, regular):
        if not regular:
            return None

        periods = regular.get("periods", [])
        next_open = regular.get("nextOpenTime")

        days = {i: None for i in range(7)}

        for p in periods:
            open_info = p.get("open")
            close_info = p.get("close")

            if not open_info:
                continue  # nemáme ani open → přeskoč

            day = open_info.get("day")

            open_t = (
                f'{open_info.get("hour", 0):02d}:{open_info.get("minute", 0):02d}'
                if open_info.get("hour") is not None
                else None
            )

            close_t = None
            if close_info:
                close_t = f'{close_info.get("hour", 0):02d}:{close_info.get("minute", 0):02d}'

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

    def map_users_voting_results(self, usersVotingResults: List[UserVotes]) -> Dict[str, List[Vote]]:
        """
        usersVotingResults: List[UserLastRoundVotes]
        returns: dict[userUUID, List[Vote]]
        """
        mapped = {}

        for user in usersVotingResults:
            votes = [
                Vote(id=int(v.itemId), value=v.rating)
                for v in user.votingResult
            ]
            mapped[user.userUUID] = votes

        return mapped