from abc import ABC, abstractmethod
from typing import Dict, List, Set

from src.services.recommendations.algorithms.async_algorithm.models import Vote
from src.services.recommendations.algorithms.async_algorithm.priority_queue import SimplePriorityQueue
from src.services.recommendations.algorithms.interface import RecAlgoCached

#
# REDISTRIBUTION UNIT
# ======================================================================
# Provides interface and base implementation for redistribution unit in the async group rec. algorithm.
#

class RedistributionContext(ABC):
    """
        Base ABC for redistribution context for queue priority functions and threshold policies.
    """

    @abstractmethod
    def get_item_total_votes(self, item_id: int):
        """ How many users voted over the given item."""
        pass

    @abstractmethod
    def get_current_round(self):
        """Returns current voting round."""
        pass

    @abstractmethod
    def get_user_queue_size(self, user_id: str):
        """Returns the size of a users queue in current voting round."""
        pass

class PriorityFunction(ABC):
    """
        Defines interface of the priority function used by the queues in redistribution unit.
    """

    @abstractmethod
    def get_priority(self, user_id: str, item_id: int, context: RedistributionContext) -> float:
        """
            For given user_id and enqueued item_id returns priority of that item based on the current redistribution context.
        """
        pass

    def get_metadata(self):
        """
            Returns basic meta-information about the priority function implementation.
        """
        return {
            "type": self.__class__.__name__,
            "general_desc": "Priority function of redistribution unit."
        }

# (More of an example of how to use it with RecAlgoCached interface, use your own models.)
class SimplePriorityFunction(PriorityFunction):
    """
        Basic priority function implementation that uses
        the total number of votes an item obtained so far
        and recommendation score for given user.
    """

    def __init__(self, group: List[int], algorithm: RecAlgoCached):
        self.algo: RecAlgoCached = algorithm
        self.algo.precalculate_scores(group)

    def get_priority(self, user_id: str, item_id: int, context: RedistributionContext) -> float:
        """
            For given user_id and enqueued item_id returns priority of that item based on the current redistribution context.
        """

        user_rating = self.algo.get_cached_prediction(user_id, item_id)
        priority = user_rating * context.get_item_total_votes(item_id)
        return priority

    def get_metadata(self):
        base = super().get_metadata()
        base["algo"] = self.algo.__class__.__name__
        return base

class RedistributionUnit(RedistributionContext):
    """
        Base implementation of redistribution unit for async group recommender.
    """

    def __init__(self, users_ids: List[str], priority_function: PriorityFunction):
        self.items_Queue = { user_id: SimplePriorityQueue() for user_id in users_ids }
        self.user_all_voted_items = { user_id: set() for user_id in users_ids } # mapping user id => all items user voted for (liked, disliked, neutral, .. => all responses)
        self.liked_items_by_user_map = {} # maps item id => users that liked this item so far
        self.priority_function = priority_function
        self.round_counter = 0


    def get_redistributed_items_all(self, users_ids: List[int]) -> Dict[int, List[int]]:
        res = { user_id: [] for user_id in users_ids }
        for user_id in users_ids:
            res[user_id] = self.get_redistributed_items(user_id)

        return res

    def get_user_redistribution_queue_size(self, user_id: str) -> bool:
        return len(self.items_Queue[user_id])

    def get_redistributed_items(self, user_id: str, t: int) -> List[int]:
        """Tries to get t redistributed items for a user.
            If not enough items are available returns all possible.
        Args:
            user_id (str): User ID.
            t (int): The t parameter from the async algorithm definition.
        """

        # Pop t items from the user queue
        recommendation_res = []
        for _ in range(t):
            item_id = self.items_Queue[user_id].pop()
            recommendation_res.append(item_id)

        return recommendation_res

    def get_user_queue_size(self, user_id: str):
        """Returns current voting round."""
        return len(self.items_Queue[user_id])

    def update_voted_items(self, users_votes_all: Dict[str, List[Vote]]) -> None:
        """Redistributes user items from the previous rounds to the current users."""

        if users_votes_all == {}:
            return

        # suppose only positive feedback items here
        users_positive_votes_only = self._filter_positive_votes_only(users_votes_all)

        # aggregate all the items users voted positively in current round
        all_liked_items_ids_in_current_round = {
            item.id for items in users_positive_votes_only.values()
            for item in items
        }

        # all items ids voted over in current round
        all_voted_items_ids_in_current_round = {
            item.id for items in users_votes_all.values()
            for item in items
        }

        for user_id, positive_votes_in_cur_round in users_positive_votes_only.items():
            # update cached votes
            self._update_positively_voted_items(user_id, positive_votes_in_cur_round) # (only items user liked)
            self._update_user_voted_items(user_id, users_votes_all[user_id]) # (all items user voted so far!!)


        for user_id, positive_votes_in_cur_round in users_positive_votes_only.items():

            # 1. Remove outdated items

            # remove all items that are not valid for the user anymore (items that others rejected/gave neutral, while current user did not see them so far)
            user_items_to_discard = (all_voted_items_ids_in_current_round - all_liked_items_ids_in_current_round)
            self.items_Queue[user_id].discard_many(user_items_to_discard)


            # 2. Redistribute all items user did not see

            # get all items user did not vote over so far
            user_all_voted_items_ids_so_far = { item.id for item in self.user_all_voted_items[user_id] }
            items_to_redistribute_to_user = all_liked_items_ids_in_current_round - user_all_voted_items_ids_so_far

            # update user priority queue
            self._enqueue_user_items(user_id, items_to_redistribute_to_user)

        self.round_counter += 1

    def _filter_positive_votes_only(self, users_votes_all: Dict[str, List[Vote]]) -> Dict[str, List[Vote]]:
        """Filter only items over which users voted positively (meaning there is a chance for a match)"""
        return {
            user_id: [item for item in items if item.value == 1]
            for user_id, items in users_votes_all.items()
        }

    def _enqueue_user_items(self, user_id: str, items_to_redistribute: Set[int]):

        for item_id in items_to_redistribute:
            # find priority
            item_priority = self._find_item_priority(user_id, item_id)
            self.items_Queue[user_id].add_or_update(item_id, item_priority)

    def _find_item_priority(self, user_id: str, item_id: int) -> float:
        self.priority_function.get_priority(user_id, item_id, self)
        item_priority = self.priority_function.get_priority(user_id, item_id, self)
        return item_priority

    def _update_positively_voted_items(self, user_id: str, positively_voted_items: List[Vote]):
        for item in positively_voted_items:
            if item.id not in self.liked_items_by_user_map:
                self.liked_items_by_user_map[item.id] = set()
            self.liked_items_by_user_map[item.id].add(user_id)

    def _update_user_voted_items(self, user_id: str, voted_items: List[Vote]):
        self.user_all_voted_items[user_id].update(voted_items)

    def get_item_total_votes(self, item_id: int):
        return len(self.liked_items_by_user_map[item_id])

    def get_current_round(self):
        return self.round_counter