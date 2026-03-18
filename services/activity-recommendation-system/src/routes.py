from flask import Blueprint
from src.controllers.movie_controller import moviesRecommendationsBlueprint
from src.controllers.restaurant_controller import restaurantRecommendationsBlueprint
from src.controllers.assets_data_controller import assetsDataBlueprint


# main blueprint to be registered with application
api = Blueprint('api', __name__)

# register user with api blueprint
api.register_blueprint(moviesRecommendationsBlueprint, url_prefix="/movie")

# register user with api blueprint
api.register_blueprint(restaurantRecommendationsBlueprint, url_prefix="/restaurant")

# register user with api blueprint
api.register_blueprint(assetsDataBlueprint, url_prefix="/assets")