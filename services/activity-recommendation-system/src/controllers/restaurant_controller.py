import os
from flask import current_app, request, Blueprint, abort
from src.controllers.DTOs.matching_session_dtos import *
from src.services.gateways.google_places_api_gateway import PlacesPhotoGateway
from src.services.recommendations.restaurant.models.places_api_convertor import PlacesAPI2RepConvertor
from src.services.recommendations.restaurant.restaurant_recommender_service import RestaurantRecommenderService
from src.database.models import MemberData
from typing import List
from src.services.recommendations.restaurant.training_manager import RestaurantRecommenderModelManager
from src.utils import *
import logging

# ===============================
# DESCRIPTION
# ===============================
# Flask controllers for restaurant
#
#

restaurantRecommendationsBlueprint = Blueprint("restaurant", __name__)

service_base_url = os.getenv("PLACES_PHOTOS_GALLERY_BASE_URL", "").rstrip("/")
if not service_base_url:
    logging.warning("Missing PLACES_PHOTOS_GALLERY_BASE_URL photos will not load correctly on localhost")

@restaurantRecommendationsBlueprint.route('/session/next', methods=["POST"])
def nextRestaurantSessionRecommendation():
    rest_rec_service = current_app.config["REST_REC_SERVICE"]

    try: # try to parse the data
        data = RecommendationUpdateDTO(**request.json)
    except Exception as e:
        logging.error(f"Failed to parse data: {e}")
        abort(400, description="Invalid data")

    recommendation = rest_rec_service.recommend_next(data)
    rec_dto = rest_rec_service.get_recommendation_dtos(recommendation, service_base_url)

    return {
        user_id: [item.to_dict() for item in items]
        for user_id, items in rec_dto.items()
    }

@restaurantRecommendationsBlueprint.route('/session/end', methods=["POST"])
def endRestaurantSessionRecommendation():
    try: # try to parse the data
        data = RecommendationUpdateDTO(**request.json)
        logging.info("[RestaurantController] endRestaurantSessionRecommendation invoked", extra={"sessionUUID": data.session.sessionUUID})
    except Exception as e:
        logging.error(f"Failed to parse data: {e}")
        abort(400, description="Invalid data")

        rest_rec_service = current_app.config["REST_REC_SERVICE"]
        sessionUUID = data.session.sessionUUID
        rest_rec_service.clearsession(sessionId=sessionUUID)

    return "Session terminated gracefully.", 200

@restaurantRecommendationsBlueprint.route('/recommender/schema', methods=["GET"])
def getRecommenderSchemaController():
    return {
        "categories": PlacesAPI2RepConvertor.get_recommender_categories_order(),
        "price_levels": PlacesAPI2RepConvertor.get_price_levels(),
        "vector_dim": len(PlacesAPI2RepConvertor.get_vector_dim())
    }