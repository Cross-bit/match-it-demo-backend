import unittest
from unittest.mock import Mock

from src.services.recommendations.restaurant.models.methods.priority_functions import (
    RestaurantRecPriorityFunction,
)


class RestaurantRecPriorityFunctionTests(unittest.TestCase):
    def test_get_priority_multiplies_score_and_votes(self):
        algo = Mock()
        algo.score_item.return_value = 0.8
        model = Mock()
        context = Mock()
        context.get_item_total_votes.return_value = 5

        priority_fn = RestaurantRecPriorityFunction(
            group=["u1", "u2"],
            model=model,
            algorithm=algo,
        )

        priority = priority_fn.get_priority("u1", 42, context)

        self.assertEqual(priority, 4.0)
        algo.score_item.assert_called_once_with("u1", 42)
        context.get_item_total_votes.assert_called_once_with(42)

    def test_get_metadata_exposes_algo_name(self):
        class DummyAlgo:
            pass

        priority_fn = RestaurantRecPriorityFunction(
            group=["u1"],
            model=Mock(),
            algorithm=DummyAlgo(),
        )

        metadata = priority_fn.get_metadata()

        self.assertIn("algo", metadata)
        self.assertEqual(metadata["algo"], "DummyAlgo")


if __name__ == "__main__":
    unittest.main()
