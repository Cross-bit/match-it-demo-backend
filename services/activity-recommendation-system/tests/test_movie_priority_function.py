import unittest
from unittest.mock import Mock

from src.services.recommendations.movie.models.methods.priority_functions import (
    MovieRecPriorityFunction,
)


class MovieRecPriorityFunctionTests(unittest.TestCase):
    def test_get_priority_uses_user_profile_and_votes(self):
        group_model = Mock()
        group_model.get_cf_user_profile.return_value = [0.1, 0.7, 0.2]

        algo = Mock()
        algo.score_item.return_value = 0.6

        context = Mock()
        context.get_item_total_votes.return_value = 4

        priority_fn = MovieRecPriorityFunction(
            group=["u1", "u2"],
            model=group_model,
            algorithm=algo,
        )

        score = priority_fn.get_priority("u1", 15, context)

        self.assertEqual(score, 2.4)
        group_model.get_cf_user_profile.assert_called_once_with("u1")
        algo.score_item.assert_called_once_with([0.1, 0.7, 0.2], 15)
        context.get_item_total_votes.assert_called_once_with(15)

    def test_get_metadata_contains_algo_name(self):
        class DummyMovieAlgo:
            pass

        priority_fn = MovieRecPriorityFunction(
            group=["u1"],
            model=Mock(),
            algorithm=DummyMovieAlgo(),
        )

        metadata = priority_fn.get_metadata()
        self.assertEqual(metadata["algo"], "DummyMovieAlgo")


if __name__ == "__main__":
    unittest.main()
