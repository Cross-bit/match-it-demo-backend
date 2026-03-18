from datetime import datetime
import logging
import os
from pathlib import Path
import pickle

from src.database.models import GpsLocation
from src.services.recommendations.algorithms.interface import RecAlgoFull
from src.services.recommendations.algorithms.knn import ItemKnnCF
from src.services.recommendations.restaurant.models.cb_model import RestaurantCbModel
from src.services.recommendations.restaurant.recommendation_model.context_data_aggregator import RestaurantContextAggregatorJsonFile
from src.services.recommendations.restaurant.data.ratings_loader import RestaurantDbRatingsLoader


ROOT = Path(__file__).resolve().parent
MOVIE_LENS_DATASET_DIR = ROOT / "../../datasets/restaurants"
MODEL_DIR = ROOT / "../../models/restaurants"

class RestaurantRecommenderModelManager:

    def __init__(self, force_retrain_on_init = False, model_retrain_interval = "0 0 * * 0"):
        """
            Initialize the MovieRecommender with a dataset directory.
        """
        self.cf_model_path = MODEL_DIR / "restaurant_knn_model.pkl"
        self._model_retrain_interval = model_retrain_interval
        self.force_retrain_on_init = force_retrain_on_init
        self.periodic_retrain = True

        self._cf_user_min_votes: int = 30
        self._max_cf_strength: float = 0.5

        self._cf_model = None
        self._cb_model = None

        self.initialize_model()

    def get_cf_model(self) -> RecAlgoFull:
        return self._cf_model

    def get_cb_model(self) -> RestaurantCbModel:
        return self._cb_model

    def initialize_model(self):
        logging.info("Initializing restaurant hybrid recommender")
        # we want to make sure to prepare
        self._cf_model = self._load_cf_model()
        self._cb_model = self._load_cb_model()

    def _load_cb_model(self) -> RestaurantCbModel:
        logging.info(" -> Initializing CB model")
        return RestaurantCbModel()

    def _load_cf_model(self) -> RecAlgoFull:
        logging.info(" -> Initializing CF model")
        self._ensure_cf_model_dir()
        if self._should_retrain():
            cf_model = self._retrain_cf_model()
        else:
            try:
                with open(self.cf_model_path, "rb") as f:
                    cf_model = pickle.load(f)
            except Exception as e:
                logging.error(f"Error loading cf_model: {e}, retraining...")
                cf_model = self._retrain_cf_model()

        return cf_model

    def _retrain_cf_model(self):
        logging.info("Retraining CF model")
        ratings_loader = RestaurantDbRatingsLoader()
        logging.info("Checking if restaurant data are in the database.")
        self._ensure_restaurant_data()
        ratings_csr, user_id_map, item_id_map = ratings_loader.load_ratings()
        sparsity = (ratings_csr.nnz / (ratings_csr.shape[0] * ratings_csr.shape[1])) if ratings_csr.shape[0] * ratings_csr.shape[1] > 0 else 0
        logging.info(f"Fitting CF model with ratings matrix shape: {ratings_csr.shape}, non_zero_values: {ratings_csr.nnz}, sparsity: {sparsity}")
        itemKnn = ItemKnnCF()
        itemKnn.fit(ratings_csr, user_id_map, item_id_map)

        with open(self.cf_model_path, "wb") as f:
            pickle.dump(itemKnn, f)

        logging.info("CF model retrained and saved")
        return itemKnn

    def _ensure_restaurant_data(self):
        location_gps = GpsLocation(50.08804, 14.42076) # fixed to prague
        min_places_in_location = 30
        search_radius = 1500
        aggregator = RestaurantContextAggregatorJsonFile()
        restaurants_data_available = aggregator.check_data_in_database(location_gps, min_places_in_location, search_radius)
        if not restaurants_data_available:
            aggregator.fetch_data_from_original_source(force_fetch=True) # TODO: use lazy load --> fetch on the fly
            restaurants_data_available = aggregator.check_data_in_database(location_gps, min_places_in_location, search_radius)
            if not restaurants_data_available: # if not enough data => abort
                raise ValueError("Not enough data available")

    def _is_cf_model_missing(self):
        return not os.path.exists(self.cf_model_path)

    def _ensure_cf_model_dir(self):
        self.cf_model_path.parent.mkdir(parents=True, exist_ok=True)

    def _should_retrain(self):
        if self.force_retrain_on_init or self._is_cf_model_missing():
            return True

        # otherwise decide based on the timestamp
        last_train = self._get_last_cf_train_time()
        next_time = self._next_scheduled_time(from_time=last_train)
        return datetime.now() >= next_time

    def _next_scheduled_time(self, from_time=None):
        if not self._model_retrain_interval:
            return None
        if from_time is None:
            from_time = datetime.now()
        #itr = croniter(self._model_retrain_interval, from_time)
        return datetime.now() #itr.get_next(datetime)

    def _get_last_cf_train_time(self):
        if not self.cf_model_path.exists():
            return None
        return datetime.fromtimestamp(self.cf_model_path.stat().st_mtime)