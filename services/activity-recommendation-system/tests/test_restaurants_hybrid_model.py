import unittest

import numpy as np
import pandas as pd

from src.services.recommendations.restaurant.models.hybrid_model import (
    RestaurantsHybridRecommender,
)


class DummyGroupModel:
    def __init__(self):
        self._ids = ["u1", "u2"]

    def get_individual_cf_profiles(self):
        return {
            "u1": np.array([1.0, 0.0, 1.0]),
            "u2": np.array([0.0, 1.0, 1.0]),
        }

    def get_individual_cb_profiles(self):
        return {
            "u1": np.array([0.5, 0.1, 0.9]),
            "u2": np.array([0.3, 0.2, 0.7]),
        }

    def get_all_connected_members_ids(self):
        return self._ids

    def get_cb_max_price(self):
        return 4

    def get_total_number_of_user_votes_cf(self, uid: str):
        return {"u1": 100, "u2": 300}[uid]

    def get_cf_group_profile(self):
        return np.array([1.0, 0.5, 0.25])

    def get_cb_group_profile(self):
        return np.array([0.7, 0.2, 0.5])


class DummyCfModel:
    def get_item_scores_from_external_vector(self, _vec):
        # Intentionally not normalized to verify normalization branch.
        return {10: 2.0, 20: 1.0, 30: 0.0}

    def get_items_catalog(self):
        return [10, 20, 30]


class DummyCbModel:
    def get_all_recommendation_by_external_profile(self, _profile, _restrictions):
        df = pd.DataFrame(
            {
                "id": [10, 20, 30],
                "score": [0.0, 2.0, 1.0],
            }
        )
        return df.set_index("id")


class RestaurantsHybridRecommenderTests(unittest.TestCase):
    def setUp(self):
        self.group_model = DummyGroupModel()
        self.cf_model = DummyCfModel()
        self.cb_model = DummyCbModel()
        self.recommender = RestaurantsHybridRecommender(
            cf_model=self.cf_model,
            cb_model=self.cb_model,
            group_model=self.group_model,
            max_cf_strength=0.3,
            cf_votes_half_saturation=500,
        )

    def test_score_item_returns_zero_for_unknown_user(self):
        score = self.recommender.score_item("missing-user", 10)
        self.assertEqual(score, 0.0)

    def test_score_item_returns_zero_for_unknown_item(self):
        score = self.recommender.score_item("u1", 999)
        self.assertEqual(score, 0.0)

    def test_score_item_returns_float_for_known_user_and_item(self):
        score = self.recommender.score_item("u1", 10)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_compute_user_hybrid_scores_applies_exclusions(self):
        individual_cf = self.group_model.get_individual_cf_profiles()
        individual_cb = self.group_model.get_individual_cb_profiles()

        merged = self.recommender._compute_user_hybrid_scores(
            user_id="u1",
            exclude_items=[20],
            individual_cf=individual_cf,
            individual_cb=individual_cb,
        )

        self.assertNotIn(20, merged.index)
        self.assertIn("score_hybrid", merged.columns)
        self.assertTrue(merged["score_hybrid"].is_monotonic_decreasing)

    def test_recommend_individual_next_top_k_returns_per_user_ranked_items(self):
        result = self.recommender.recommend_individual_next_top_k(
            top_k=2,
            exclude_items=[],
        )

        self.assertSetEqual(set(result.keys()), {"u1", "u2"})
        self.assertEqual(len(result["u1"]), 2)
        self.assertEqual(len(result["u2"]), 2)
        self.assertIsInstance(result["u1"][0][0], int)
        self.assertIsInstance(result["u1"][0][1], float)

    def test_alpha_increases_with_vote_volume(self):
        # Keep one member with low votes and one with higher votes.
        low_votes_alpha = self.recommender._mixing_alpha_value(["u1"])
        high_votes_alpha = self.recommender._mixing_alpha_value(["u2"])

        self.assertGreater(high_votes_alpha, low_votes_alpha)
        self.assertGreaterEqual(low_votes_alpha, 0.0)
        self.assertLessEqual(high_votes_alpha, 0.3)


if __name__ == "__main__":
    unittest.main()
