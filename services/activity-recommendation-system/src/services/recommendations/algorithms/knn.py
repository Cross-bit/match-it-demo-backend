from typing import Dict, List, Optional, Set
import warnings
import numpy as np
import pandas as pd
from surprise import KNNBasic
from scipy.sparse import csr_matrix

from surprise import Reader, Dataset
from src.services.recommendations.algorithms.interface import RecAlgoFull
from src.services.recommendations.algorithms.iterators import TopKIterator


class ItemKnnCFModel:

    def __init__(self, trainset, neighbors_k):
        sim_options = {
            'name': 'cosine',
            'user_based': False  # This enables item-item CF
        }

        self.algo = KNNBasic(sim_options=sim_options, k=neighbors_k, verbose=False)
        self.algo.fit(trainset)


    def recommend(self, user_id, known_items, k):
        """Recommends top_k items for user_id. Excludes known_items.
        Returns:
            List[Tuple[int, float]]: Returns list of top_k (item_id, score) pairs.
        """
        # Get all items in trainset
        all_items = set(self.algo.trainset.all_items())

        # Predict for unseen items
        candidates = all_items - known_items
        predictions = []
        for iid in candidates:
            pred = self.algo.predict(user_id, self.algo.trainset.to_raw_iid(iid))
            predictions.append((iid, pred.est))

        # Sort by estimated rating
        top_k = sorted(predictions, key=lambda x: x[1], reverse=True)[:k]
        return top_k


class ItemKnnCF(RecAlgoFull):
    def __init__(self, neighbors_k: int = 50):

        sim_options = {
            'name': 'cosine',
            'user_based': False
        }

        self._neighbors_k = neighbors_k
        self._sim_options = sim_options

        self.algo = None
        self._ratings_matrix: Optional[csr_matrix] = None
        self._user_id_to_internal_row_index: Dict[int, int] = {}
        self._item_id_to_internal_col_index: Dict[int, int] = {}
        self._internal_col_index_to_item_id: Dict[int, int] = {}
        self._cached_scores: Dict[int, np.ndarray] = {}

    def fit(
        self,
        ratings: csr_matrix,
        user_id_map: Dict[int, int],
        item_id_map: Dict[int, int],
    ) -> "RecAlgoFull":
        """Fit the KNN model using Surprise, but also keep CSR + maps."""

        # keep references for interface
        self._ratings_matrix = ratings
        self._user_id_to_internal_row_index = {v: k for k, v in user_id_map.items()}
        self._item_id_to_internal_col_index = {v: k for k, v in item_id_map.items()}
        self._internal_col_index_to_item_id = item_id_map

        # convert csr -> dataframe for Surprise
        rows, cols = ratings.nonzero()
        data = [
            (user_id_map[r], item_id_map[c], ratings[r, c])
            for r, c in zip(rows, cols)
        ]
        reader = Reader(rating_scale=(0, ratings.max()))
        dataset = Dataset.load_from_df(
            pd.DataFrame(data, columns=["uid", "iid", "rating"]), reader
        )
        trainset = dataset.build_full_trainset()

        self.algo = KNNBasic(sim_options=self._sim_options, k=self._neighbors_k, verbose=False)
        self.algo.fit(trainset)

        return self

    def predict(self, user_id: int, item_id: int) -> float:
        if self.algo is None:
            raise Exception("Model not fitted yet.")
        if user_id not in self._user_id_to_internal_row_index:
            raise ValueError(f"Unknown user_id {user_id}")
        if item_id not in self._item_id_to_internal_col_index:
            raise ValueError(f"Unknown item_id {item_id}")

        return float(self.algo.predict(user_id, item_id).est)

    def precalculate_scores(self, user_ids: List[int]) -> None:
        for user_id in user_ids:
            if user_id not in self._user_id_to_internal_row_index:
                continue
            if user_id not in self._cached_scores:
                user_vector = self.get_user_vector(user_id)
                self._cached_scores[user_id] = self.get_item_scores(user_vector)

    def get_cached_prediction(self, user_id: int, item_id: int) -> float:
        if user_id not in self._cached_scores:
            raise Exception(f"User {user_id} not cached.")
        if item_id not in self._item_id_to_internal_col_index:
            raise Exception(f"Item {item_id} not known.")
        idx = self._item_id_to_internal_col_index[item_id]
        return self._cached_scores[user_id][idx]

    def clear_cached_scores(self, user_id: Optional[int] = -1) -> None:
        if user_id == -1:
            self._cached_scores = {}
        elif user_id in self._cached_scores:
            del self._cached_scores[user_id]
        else:
            warnings.warn(f"Clearing cache: User {user_id} not in cache, skipping.")

    def get_user_vector(self, user_id: int) -> np.ndarray:
        if self._ratings_matrix is None:
            raise Exception("Model not fitted yet.")
        if user_id not in self._user_id_to_internal_row_index:
            raise ValueError(f"User {user_id} not known.")
        row_idx = self._user_id_to_internal_row_index[user_id]
        return self._ratings_matrix[row_idx, :].toarray().flatten()

    def get_items_catalog(self) -> List[int]:
        """
        Return the ordered list of item_ids corresponding to the internal item order
        used by the model (same order as expected by get_item_scores_external()).
        """

        items_catalog = [
            self._internal_col_index_to_item_id[i]
            for i in range(len(self._internal_col_index_to_item_id))
        ]
        return items_catalog

    def get_item_scores_from_external_vector(
        self,
        user_vector: np.ndarray,
        exclude_items: Optional[Set[int]] = None
    ) -> Dict[int, float]:
        """
            Compute predicted item scores for an external user vector.
            Returns a dict of item_id -> score, for the entire catalog.
            Optionally excludes items (e.g., current session items).
        """

        if self.algo is None:
            raise Exception("Model not fitted yet.")

        sim = self.algo.sim
        n_items = sim.shape[0]
        scores = {}

        rated_mask = user_vector > 0

        for i in range(n_items):
            item_id = self._internal_col_index_to_item_id[i]
            if exclude_items and item_id in exclude_items:
                continue

            sims = sim[i, rated_mask]
            ratings = user_vector[rated_mask]

            if sims.size == 0:
                scores[item_id] = 0.0
            else:
                denom = np.abs(sims).sum()
                scores[item_id] = np.dot(sims, ratings) / denom if denom != 0 else 0.0

        return scores

    def get_item_scores(self, user_vector: np.ndarray) -> np.ndarray:
        if self.algo is None:
            raise Exception("Model not fitted yet.")
        scores = []
        for idx in range(len(user_vector)):
            item_id = self._internal_col_index_to_item_id[idx]
            if user_vector[idx] > 0:  # skip known items
                scores.append(-np.inf)
            else:
                scores.append(self.algo.predict(0, item_id, r_ui=None, verbose=False).est) # the 0 is because we are using ItemKNN, surprise ignores it
        return np.array(scores)

    def item_id_to_index(self, item_id: int) -> int:
        if item_id not in self._item_id_to_internal_col_index:
            raise ValueError(f"Unknown item_id {item_id}")
        return self._item_id_to_internal_col_index[item_id]

    def index_to_item_id(self, index: int) -> int:
        if index not in self._internal_col_index_to_item_id:
            raise ValueError(f"Unknown index {index}")
        return self._internal_col_index_to_item_id[index]

    def top_k_iterator(self, user_id: int, exclude: Optional[Set[int]] = None):
        if user_id not in self._cached_scores:
            user_vector = self.get_user_vector(user_id)
            scores = self.get_item_scores(user_vector)
        else:
            scores = self._cached_scores[user_id]

        item_scores = [
            (self._internal_col_index_to_item_id[i], scores[i])
            for i in range(len(scores))
        ]
        return TopKIterator(item_scores, exclude=exclude)