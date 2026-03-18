import logging
from pathlib import Path
import time
from typing import Tuple
from flask import (Blueprint, abort, jsonify, request)

from src.controllers.DTOs.matching_session_dtos import *
from src.controllers.DTOs.movie_dtos import MovieCardDTO
from src.database.exceptions import *
from src.domain.movie_card import MovieCard
from src.services.gateways.movie_data_gateway import (
    TMDBGateway, movielens_ids_to_tmdb_ids)

from src.services.recommendations.movie.initialization.baselinepred import BaselineInitializer
from src.services.recommendations.movie.initialization.init_picker import InitSetPicker
from src.services.recommendations.movie.models.cf_model import DiversifiedRecommender, EaserModel, EaserRecommender
from src.services.recommendations.movie.movies_recommender_service import \
    MovieRecommenderService
from src.utils import *


##
## Handling functions
##

def parse_recommendation_update_dto(data: dict) -> RecommendationUpdateDTO:
    """
        Parses received recommendation update DTO.
    Exception:
        Returns HTTP status 400 on invalid data.
    Args:
        data (dict): Incoming session update data.
    """

    try: # try to interpret data as expected DTO first
        logging.info("**data")
        logging.info(data)
        return RecommendationUpdateDTO(**data)
    except Exception as e:
        logging.error(f"Failed to parse data: {e}")
        abort(400, description="Invalid data")


def ensure_init_sets_exist(catalog: List[int]):
    init_file_name = "baseline_init_sets.json"
    ROOT = Path(__file__).resolve().parent
    INIT_DATASET_DIR = ROOT / "../services/datasets/movies/initialization" / init_file_name

    if INIT_DATASET_DIR.exists():
        print("[INIT] baseline_init_sets.json already exists.")
        return

    print("[INIT] baseline_init_sets.json NOT found → generating...")

    initializer = BaselineInitializer(catalog, output_file_name=init_file_name)
    initializer.generate_init_data()


##
## FLASK APPLICATION ENDPOINTS
##

moviesRecommendationsBlueprint = Blueprint("movie", __name__)

easer_model = EaserModel()
easer_recommender = EaserRecommender(easer_model)
diversified_mov_rec = DiversifiedRecommender(easer_recommender)

deck_size = 5
recommender_service = MovieRecommenderService(diversified_mov_rec, deck_size)

init_set_picker = InitSetPicker()

ensure_init_sets_exist(easer_model.get_catalog())


@moviesRecommendationsBlueprint.route('/session/next', methods=["POST"])
def nextMovieSessionRecommendation():
    logging.info(f"[MoviesController] nextMovieSessionRecommendation invoked")
    # Parse incoming json data
    raw_data = request.json

    try: # try to interpret data as expected DTO first
        logging.error(f"raw: {raw_data}")
        update_dto = RecommendationUpdateDTO(**raw_data)
    except Exception as e:
        logging.error(f"Failed to parse data: {e}")
        abort(400, description="Invalid data")

    start_time = time.time()
    recommendations = recommender_service.recommend_next(update_dto)
    logging.info(f"\nNew group recommendes: {recommendations}")
    end_time = time.time()
    logging.info(f"\nRecommendation process time for session {update_dto.session}: {end_time - start_time}s")

    # convert recommendation results into response DTOs
    rec_dto = recommender_service.get_movie_cards_response(recommendations)

    return {
        user_id: [item.to_dict() for item in items]
        for user_id, items in rec_dto.items()
    }

@moviesRecommendationsBlueprint.route('/session/end', methods=["POST"])
def endMovieSessionRecommendation():
    data = parse_recommendation_update_dto(request.json)
    logging.info("[MoviesController] endMovieSessionRecommendation invoked", extra={"sessionUUID": data.session.sessionUUID})
    sessionUUID = data.session.sessionUUID
    recommender_service.clear_session(sessionId=sessionUUID)

    return "Session terminated gracefully.", 200

@moviesRecommendationsBlueprint.route('/session/initialise', methods=["GET"])
def getMovieSessionInitialisationRecommendation():
    init_pick = init_set_picker.pick_random()
    tmdb_ids = movielens_ids_to_tmdb_ids(init_pick)
    movies_gateway = TMDBGateway()
    movie_cards: List[MovieCard] = movies_gateway.get_movies_details(tmdb_ids)
    dtos = [MovieCardDTO.from_domain(card).to_dict() for card in movie_cards]
    return dtos
