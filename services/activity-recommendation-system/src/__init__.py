from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, request, abort, send_from_directory
import os
import time
import logging
import psycopg2

from src.services.gateways.google_places_api_gateway import PlacesPhotoGateway
from src.services.recommendations.restaurant.restaurant_recommender_service import RestaurantRecommenderService
from src.services.recommendations.restaurant.training_manager import RestaurantRecommenderModelManager

# ================================
# DESCRIPTIONS
# ================================
# Definition for the flask REST API application.
# Put application settings here.
#
# Includes routes set up.
#

# Make sure any additional envs are loaded from the .env file.
load_dotenv()

MATCHING_SERVICE_NAME = os.environ.get("MATCHING_SESSIONS_SERVICE_IDENTIFIER")
MATCHING_SERVICE_TOKEN = os.environ.get("RECSYS_MESSAGING_SERVICE_TOKEN")

if not MATCHING_SERVICE_NAME or not MATCHING_SERVICE_TOKEN:
    raise RuntimeError("Missing service auth configuration")

# list of services which can access recommenders API
VALID_SERVICES = {
    MATCHING_SERVICE_NAME: MATCHING_SERVICE_TOKEN
}


BASE_DIR = Path(__file__).resolve().parent
DOCS_DIR = BASE_DIR / "docs"


def wait_for_main_db(max_retries: int = 30, delay_s: float = 2.0) -> None:
    """
    Wait until the main Postgres database accepts TCP connections.
    Prevents cold-start crashes when the API starts before db1 is ready.
    """
    db_name = os.getenv("MAIN_DB_NAME")
    db_user = os.getenv("MAIN_DB_USER")
    db_pass = os.getenv("MAIN_DB_PASS")
    db_host = os.getenv("MAIN_DB_HOST")
    db_port = os.getenv("MAIN_DB_PORT")

    for attempt in range(1, max_retries + 1):
        try:
            with psycopg2.connect(
                dbname=db_name,
                user=db_user,
                password=db_pass,
                host=db_host,
                port=db_port,
                connect_timeout=3,
            ):
                logging.info("Main DB is ready (%s:%s).", db_host, db_port)
                return
        except Exception as exc:
            if attempt == max_retries:
                logging.error(
                    "Main DB is not reachable after %s attempts (%s:%s).",
                    max_retries,
                    db_host,
                    db_port,
                )
                raise
            logging.warning(
                "Waiting for main DB attempt %s/%s failed: %s",
                attempt,
                max_retries,
                exc,
            )
            time.sleep(delay_s)

# Declare flask application.
flaskApp = Flask(
    __name__,
    static_folder=str(BASE_DIR / "static"),
    static_url_path="/static"
)


# === INIT MODELS & SERVICES ===
wait_for_main_db()
models_manager = RestaurantRecommenderModelManager(
    force_retrain_on_init=True
)

cb_model = models_manager.get_cb_model()
cf_model = models_manager.get_cf_model()

google_places_gateway = PlacesPhotoGateway()

rest_rec_service = RestaurantRecommenderService(
    cf_model,
    cb_model,
    google_places_gateway,
    recommendation_size=5
)

# uložíš do app contextu
flaskApp.config["REST_REC_SERVICE"] = rest_rec_service

# === REGISTER BLUEPRINTS ===
from src.controllers.restaurant_controller import restaurantRecommendationsBlueprint

flaskApp.register_blueprint(restaurantRecommendationsBlueprint)


# Set up the dev settings.
IS_DEV = os.getenv("IS_DEV") == "1"
if (IS_DEV):
    flaskApp.config['DEBUG'] = True
    flaskApp.config['PROPAGATE_EXCEPTIONS'] = True

# Set up the routes.

from src.routes import api
flaskApp.register_blueprint(api, url_prefix="/api")


@flaskApp.get("/api/docs/openapi.json")
def openapi_json():
    return send_from_directory(str(DOCS_DIR), "openapi.json")


@flaskApp.get("/api/docs")
def swagger_ui():
    return """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Activity Recommendation API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/docs/openapi.json",
        dom_id: "#swagger-ui"
      });
    </script>
  </body>
</html>
"""


#
# Validation of tokens
#

@flaskApp.before_request
def check_internal_auth():
    skip = os.environ.get("SKIP_INTERNAL_AUTH") == "1"

    if request.path.startswith("/static/"):
        return

    if request.path.startswith("/api/docs"):
        return

    if skip:
        return

    auth_header = request.headers.get("Authorization")
    service_name = request.headers.get("X-Service-Name")

    if not auth_header or not service_name:
        abort(401)

    try:
        token = auth_header.split(" ")[1]
    except Exception:
        abort(401)

    expected_token = VALID_SERVICES.get(service_name)

    # we check token for given service
    if not expected_token or token != expected_token:
        abort(403)

