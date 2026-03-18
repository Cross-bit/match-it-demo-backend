#!/bin/python3
import warnings
import numpy as np
from typing import Dict, List, Optional,Set
from scipy.sparse import csr_matrix

from src.services.recommendations.algorithms.interface import RecAlgoFull
from src.services.recommendations.algorithms.iterators import TopKIterator

# ===================================
# DESCRIPTION
# ===================================
# Implementation of Easer algorithm according to the original paper
# https://arxiv.org/pdf/1905.03375
#
# + evaluations

class EaserSparse(RecAlgoFull):
    """
        Implementation of EASE^R algorithm using the sparse implementation.
    """

    def __init__(self, l2: float = 0.5):
        self.l2 = l2
        self.B = None  # item-item similarity matrix

        self._user_id_to_internal_row_index: Dict[int, int] = {}
        self._item_id_to_internal_col_index: Dict[int, int] = {}
        self._internal_col_index_to_item_id: Dict[int, int] = {}
        self._ratings_matrix: Optional[csr_matrix] = None
        self._cached_scores: Dict[int, np.ndarray] = {}

    def fit(self, ratings: csr_matrix, user_id_map: Dict[int, int], item_id_map: Dict[int, int]) -> "RecAlgoFull":
        """
        Fit the EASE model using a sparse user-item matrix.

        Args:
            ratings (csr_matrix): User-item matrix.
            user_id_map (Dict[int, int]): CSR row index → external user_id
            item_id_map (Dict[int, int]): CSR col index → external item_id
        """

        self._user_id_to_internal_row_index = {v: k for k, v in user_id_map.items()}
        self._item_id_to_internal_col_index = {v: k for k, v in item_id_map.items()}

        self._internal_col_index_to_item_id = item_id_map

        self._ratings_matrix = ratings

        G = ratings.T @ ratings  # item-item co-occurrence
        G = G.toarray()
        diag = np.arange(G.shape[0])
        G[diag, diag] += self.l2

        P = np.linalg.inv(G)
        B = -P / np.diag(P)[:, None]
        B[diag, diag] = 0

        self.B = B

        return self

    def predict(self, user_id: int, item_id: int) -> float:
        if self._ratings_matrix is None:
            raise Exception("No model data found. Call fit() first.")

        # mapování externích ID na interní indexy
        if user_id not in self._user_id_to_internal_row_index:
            raise ValueError(f"Unknown user_id: {user_id}")
        if item_id not in self._item_id_to_internal_col_index:
            raise ValueError(f"Unknown item_id: {item_id}")

        row_idx  = self._user_id_to_internal_row_index[user_id]
        col_idx  = self._item_id_to_internal_col_index[item_id]

        user_vector = self._ratings_matrix[row_idx, :]
        return float(user_vector @ self.B[:, col_idx])

    def precalculate_scores(self, user_ids: List[int]):
        """
        Compute and cache predicted scores for users.
        """
        for user_id in user_ids:
            if user_id not in self._user_id_to_internal_row_index:
                continue

            if user_id not in self._cached_scores:
                row_idx = self._user_id_to_internal_row_index[user_id]
                user_vector = self._ratings_matrix[row_idx, :].toarray().flatten()
                self._cached_scores[user_id] = user_vector @ self.B

    def clear_cached_scores(self, user_id: Optional[int] = -1):
        if user_id == -1:
            self._cached_scores: Dict[int, np.ndarray] = {} # reset entire cache
        elif user_id in self._cached_scores:
            del self._cached_scores[user_id]
        else:
            warnings.warn("Clearing cache: User id {user_id} was not in cache, skipping.")

    def get_cached_prediction(self, user_id: int, item_id: int) -> float:
        """
        Get the prediction score for a user-item pair.

        Raises:
            Exception if user or item not found in model.
        """
        if user_id not in self._cached_scores:
            raise Exception(f"User {user_id} not cached.")
        if item_id not in self._item_id_to_internal_col_index:
            raise Exception(f"Item {item_id} not known.")

        item_idx = self._item_id_to_internal_col_index[item_id]
        return self._cached_scores[user_id][item_idx]

    def get_item_scores(self, user_vector: np.ndarray) -> np.ndarray:
        """
        Returns predicted item scores for the given user vector.
        Args:
            user_vector (np.ndarray): Dense user vector (shape: [n_items])
        Returns:
            np.ndarray: Dense score vector (shape: [n_items])
        """
        if self.B is None:
            raise Exception("Model not fitted yet.")

        return user_vector @ self.B

    def get_user_vector(self, user_id: int) -> np.ndarray:
        """
        Returns a dense user vector from the internal CSR matrix.
        Args:
            user_id (int): External user ID.
        Returns:
            np.ndarray: Dense user vector (shape: [n_items])
        """

        if self._ratings_matrix is None:
            raise Exception("Model not fitted yet.")
        if user_id not in self._user_id_to_internal_row_index:
            raise ValueError(f"User {user_id} not known.")

        row_idx = self._user_id_to_internal_row_index[user_id]
        return self._ratings_matrix[row_idx, :].toarray().flatten()

    def item_id_to_index(self, item_id: int) -> int:
        """
        Maps external item_id to internal column index.

        Args:
            item_id (int): External item ID

        Returns:
            int: Internal index in the score vector / matrix
        """
        if item_id not in self._item_id_to_internal_col_index:
            raise ValueError(f"Unknown item_id: {item_id}")
        return self._item_id_to_internal_col_index[item_id]

    def index_to_item_id(self, index: int) -> int:
        """
        Maps internal column index back to external item_id.

        Args:
            index (int): Internal item index

        Returns:
            int: External item ID
        """
        if index not in self._internal_col_index_to_item_id:
            raise ValueError(f"Unknown internal item index: {index}")
        return self._internal_col_index_to_item_id[index]


    def top_k_iterator(self, user_id: int, exclude: Optional[Set[int]] = None) -> TopKIterator:
        """
        Iterator over top-K items by predicted score for a given user.

        Args:
            user_id (int): ID of the user.
            exclude (set): Optional set of item IDs to exclude.

        Returns:
            TopKIterator: sorted descending (item_id, score) pairs.
        """
        if user_id not in self._cached_scores:
            row_idx = self._user_id_to_internal_row_index[user_id]
            user_vector = self._ratings_matrix[row_idx, :].toarray().flatten()
            scores = self.get_item_scores(user_vector)
        else:
            scores = self._cached_scores[user_id]

        item_scores = [(self._internal_col_index_to_item_id[i], scores[i]) for i in range(len(scores))]
        return TopKIterator(item_scores, exclude=exclude)
