import unittest
from unittest.mock import patch

from src.domain.session_parameters import AlgorithmType
from src.services.recommendations.movie.models.methods.method_factory import (
    AlgoContext as MovieAlgoContext,
    AlgoMethodFactory as MovieAlgoMethodFactory,
)
from src.services.recommendations.restaurant.models.methods.method_factory import (
    AlgoContext as RestaurantAlgoContext,
    AlgoMethodFactory as RestaurantAlgoMethodFactory,
)


class MethodFactoryTests(unittest.TestCase):
    @patch("src.services.recommendations.movie.models.methods.method_factory.HybridGroupMovieRecommender")
    def test_movie_factory_creates_hybrid(self, engine_cls):
        engine_instance = object()
        engine_cls.return_value = engine_instance
        ctx = MovieAlgoContext(
            users_ids=["u1", "u2"],
            recommender=object(),
            recommendation_size=5,
            group_model=object(),
        )

        result = MovieAlgoMethodFactory.create_method(AlgorithmType.HYBRID, ctx)

        self.assertIs(result, engine_instance)
        engine_cls.assert_called_once()

    @patch("src.services.recommendations.movie.models.methods.method_factory.AsyncGroupMovieRecommender")
    def test_movie_factory_accepts_string_algo_type(self, engine_cls):
        engine_cls.return_value = "async-engine"
        ctx = MovieAlgoContext(
            users_ids=["u1"],
            recommender=object(),
            recommendation_size=3,
            group_model=object(),
        )

        result = MovieAlgoMethodFactory.create_method("ASYNC", ctx)
        self.assertEqual(result, "async-engine")

    def test_movie_factory_raises_for_unknown_algorithm(self):
        ctx = MovieAlgoContext(
            users_ids=["u1"],
            recommender=object(),
            recommendation_size=3,
            group_model=object(),
        )
        with self.assertRaises(ValueError):
            MovieAlgoMethodFactory.create_method("INVALID", ctx)

    @patch("src.services.recommendations.restaurant.models.methods.method_factory.SyncGroupRestaurantRecommender")
    def test_restaurant_factory_creates_sync(self, engine_cls):
        engine_cls.return_value = "sync-engine"
        ctx = RestaurantAlgoContext(
            users_ids=["u1", "u2"],
            recommender=object(),
            recommendation_size=4,
            group_model=object(),
        )

        result = RestaurantAlgoMethodFactory.create_method(AlgorithmType.SYNC, ctx)
        self.assertEqual(result, "sync-engine")

    @patch("src.services.recommendations.restaurant.models.methods.method_factory.HybridGroupRestaurantRecommender")
    def test_restaurant_factory_creates_hybrid_from_string(self, engine_cls):
        engine_cls.return_value = "hybrid-engine"
        ctx = RestaurantAlgoContext(
            users_ids=["u1"],
            recommender=object(),
            recommendation_size=2,
            group_model=object(),
        )

        result = RestaurantAlgoMethodFactory.create_method("HYBRID", ctx)
        self.assertEqual(result, "hybrid-engine")


if __name__ == "__main__":
    unittest.main()
