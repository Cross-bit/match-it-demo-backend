import unittest

from src.services.recommendations.algorithms.iterators import TopKIterator


class TopKIteratorTests(unittest.TestCase):
    def test_iterates_items_in_descending_score_order(self):
        iterator = TopKIterator(
            item_scores=[("a", 0.1), ("b", 0.9), ("c", 0.5)],
        )
        self.assertEqual(next(iterator), "b")
        self.assertEqual(next(iterator), "c")
        self.assertEqual(next(iterator), "a")

    def test_skips_excluded_items(self):
        iterator = TopKIterator(
            item_scores=[("a", 0.9), ("b", 0.8), ("c", 0.7)],
            exclude={"a", "c"},
        )
        self.assertEqual(next(iterator), "b")
        with self.assertRaises(StopIteration):
            next(iterator)

    def test_empty_input_stops_immediately(self):
        iterator = TopKIterator(item_scores=[])
        with self.assertRaises(StopIteration):
            next(iterator)


if __name__ == "__main__":
    unittest.main()
