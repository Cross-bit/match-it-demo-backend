import unittest

import numpy as np
from scipy.sparse import csr_matrix

from src.services.recommendations.algorithms.easer import EaserSparse


class EaserSparseTests(unittest.TestCase):
    def setUp(self):
        # 2 users x 3 items
        # user 101 -> items [1,0,1]
        # user 102 -> items [0,1,1]
        self.ratings = csr_matrix(np.array([[1.0, 0.0, 1.0], [0.0, 1.0, 1.0]]))
        self.user_map = {0: 101, 1: 102}
        self.item_map = {0: 11, 1: 22, 2: 33}
        self.model = EaserSparse(l2=0.5).fit(self.ratings, self.user_map, self.item_map)

    def test_predict_returns_float_for_known_user_item(self):
        value = self.model.predict(101, 11)
        self.assertIsInstance(value, float)

    def test_predict_raises_for_unknown_user(self):
        with self.assertRaises(ValueError):
            self.model.predict(999, 11)

    def test_item_index_mapping_roundtrip(self):
        idx = self.model.item_id_to_index(22)
        self.assertEqual(self.model.index_to_item_id(idx), 22)

    def test_precalculate_and_cached_prediction(self):
        self.model.precalculate_scores([101])
        cached = self.model.get_cached_prediction(101, 11)
        self.assertIsInstance(float(cached), float)

    def test_clear_cached_scores_single_user(self):
        self.model.precalculate_scores([101, 102])
        self.model.clear_cached_scores(101)
        with self.assertRaises(Exception):
            self.model.get_cached_prediction(101, 11)

    def test_top_k_iterator_respects_exclude(self):
        self.model.precalculate_scores([101])
        iterator = self.model.top_k_iterator(101, exclude={11})
        first = next(iterator)
        self.assertNotEqual(first, 11)


if __name__ == "__main__":
    unittest.main()
