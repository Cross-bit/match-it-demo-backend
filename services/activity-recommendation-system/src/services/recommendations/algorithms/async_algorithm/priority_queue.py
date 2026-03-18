from queue import PriorityQueue
import logging
from typing import Any, Callable, Dict, Iterable, List, Tuple


class SimplePriorityQueue:
    """
    Simple priority queue for small sets of items.
    Rebuilds the queue on each update.
    Uses max-priority (highest value first).
    """

    def __init__(self) -> None:
        self.queue: PriorityQueue[tuple[float, Any]] = PriorityQueue()
        self.items: Dict[Any, float] = {}

    def add_many(self, items: Iterable[Tuple[Any, float]]) -> None:
        """
        Add or update multiple items at once, then rebuild the queue.

        :param items: Iterable of (item_id, priority) pairs
        """
        for item_id, priority in items:
            self.items[item_id] = priority
        self._rebuild()

    def add_or_update(self, item_id: Any, priority: float) -> None:
        """Add or update an item, then rebuild the queue."""
        self.items[item_id] = priority
        self._rebuild()

    def discard(self, item_id: Any) -> None:
        """Remove item if it exists; do nothing otherwise."""
        if item_id in self.items:
            del self.items[item_id]
            self._rebuild()

    def discard_many(self, item_ids: List[Any]) -> None:
        """Remove all items from the queue if they exist; do nothing for missing items."""
        for item_id in item_ids:
            if item_id in self.items:
                del self.items[item_id]

        self._rebuild()

    def _rebuild(self) -> None:
        """Rebuild the entire queue from current priorities."""
        self.queue = PriorityQueue()
        for item_id, priority in self.items.items():
            logging.info(item_id)
            self.queue.put((-priority, item_id))  # invert priority for max-heap behavior

        logging.info("rebuild called")
        logging.info(self.queue)

    def pop(self) -> Any:
        """Remove and return the item with the highest priority."""

        logging.info("pop called")
        if self.queue.empty():
            raise KeyError("pop from empty queue")
        neg_priority, item_id = self.queue.get()
        del self.items[item_id]
        return item_id

    def update_all_priorities(self, get_new_priority: Callable[[Any], float]) -> None:
        """Recalculate priorities for all items, then rebuild."""
        for item_id in list(self.items.keys()):
            self.items[item_id] = get_new_priority(item_id)
        self._rebuild()

    def __len__(self) -> int:
        """Return the number of items currently in the queue."""
        return len(self.items)

    def __str__(self) -> str:
        if not self.items:
            return "SimplePriorityQueue(empty)"
        sorted_items = sorted(self.items.items(), key=lambda x: x[1], reverse=True)
        items_str = "\n".join(f"  {item_id}: {priority:.3f}" for item_id, priority in sorted_items)
        return f"SimplePriorityQueue with {len(self)} items:\n{items_str}"