import unittest

from src.services.recommendations.algorithms.async_algorithm.priority_queue import (
    SimplePriorityQueue,
)


class SimplePriorityQueueTests(unittest.TestCase):
    def test_pop_returns_highest_priority_item(self):
        q = SimplePriorityQueue()
        q.add_many([("a", 1.0), ("b", 5.0), ("c", 3.0)])
        self.assertEqual(q.pop(), "b")
        self.assertEqual(len(q), 2)

    def test_add_or_update_changes_order(self):
        q = SimplePriorityQueue()
        q.add_many([("a", 1.0), ("b", 2.0)])
        q.add_or_update("a", 10.0)
        self.assertEqual(q.pop(), "a")

    def test_discard_many_ignores_missing_items(self):
        q = SimplePriorityQueue()
        q.add_many([("a", 1.0), ("b", 2.0), ("c", 3.0)])
        q.discard_many(["b", "x-missing"])
        self.assertEqual(len(q), 2)
        self.assertEqual(q.pop(), "c")

    def test_update_all_priorities_rebuilds_queue(self):
        q = SimplePriorityQueue()
        q.add_many([("a", 1.0), ("b", 2.0), ("c", 3.0)])
        q.update_all_priorities(lambda item_id: {"a": 10.0, "b": 1.0, "c": 0.5}[item_id])
        self.assertEqual(q.pop(), "a")

    def test_pop_on_empty_raises_key_error(self):
        q = SimplePriorityQueue()
        with self.assertRaises(KeyError):
            q.pop()


if __name__ == "__main__":
    unittest.main()
