import logging
import os

from flask import Blueprint, abort, request

from src.database.models import SessionType
from src.services.assets.assets_service import AssetsDataService
from src.services.gateways.google_places_api_gateway import PlacesPhotoGateway
from src.services.gateways.movie_data_gateway import (TMDBGateway)

movies_gateway = TMDBGateway()
google_places_gateway = PlacesPhotoGateway()

service_base_url = os.getenv("PLACES_PHOTOS_GALLERY_BASE_URL", "").rstrip("/")
if not service_base_url:
    logging.warning("Missing PLACES_PHOTOS_GALLERY_BASE_URL photos will not load correctly on localhost")

assets_data_service = AssetsDataService(movies_gateway, google_places_gateway)

def parse_card_ids(raw: str) -> list[int]:
    try:
        ids = [int(x) for x in raw.split(",")]
        if not ids:
            raise ValueError()
        return ids
    except Exception:
        abort(400, description="Invalid cardId format, expected comma-separated numbers")

def parse_session_type(raw: str) -> SessionType:
    try:
        return SessionType(raw)
    except ValueError:
        abort(400, description=f"Invalid sessionType '{raw}'")

assetsDataBlueprint = Blueprint("assets", __name__)

@assetsDataBlueprint.route('/cards', methods=["GET"])
def get_cards_preview():
    logging.info("[MoviesController] get_cards_preview invoked")

    raw_card_ids = request.args.get("cardId")
    raw_session_type = request.args.get("sessionType")

    if not raw_card_ids or not raw_session_type:
        abort(400, description="cardId and sessionType query params are required")

    card_ids = parse_card_ids(raw_card_ids)
    session_type = parse_session_type(raw_session_type)

    logging.info(
        "[MoviesController] Fetching card previews",
        extra={
            "cardIds": card_ids,
            "sessionType": session_type.value
        }
    )

    if session_type == SessionType.MOVIE:
        cards = assets_data_service.get_movie_cards_data(card_ids)
    elif session_type == SessionType.RESTAURANT:
        cards = assets_data_service.get_restaurant_cards_data(card_ids, service_base_url)
    else:
        abort(400, description="Unsupported sessionType")

    return {
        "sessionType": session_type.value,
        "cards": [card.to_dict() for card in cards.values()]
    }, 200
