import re
import unicodedata
from typing import Set


class RestaurantTitleSimilarity:
    """
    Lightweight title similarity for restaurant names.
    Uses normalized token + character trigram overlap.
    """

    _STOPWORDS = {
        "the", "a", "an", "of", "and", "in", "to", "for", "on",
        "restaurant", "restaurace", "bistro", "bar", "grill", "cafe"
    }

    _COMPANY_SUFFIXES_RE = re.compile(r"\b(s\.?r\.?o\.?|a\.?s\.?|ltd\.?|inc\.?)\b", re.IGNORECASE)
    _NON_ALNUM_RE = re.compile(r"[^a-zA-Z0-9 ]")
    _MULTI_SPACE_RE = re.compile(r"\s+")

    def __init__(self, min_overlap_ratio: float = 0.5, min_shared_trigrams: int = 4):
        self.min_overlap_ratio = min_overlap_ratio
        self.min_shared_trigrams = min_shared_trigrams

    def _ascii_clean(self, text: str) -> str:
        return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

    def _normalize(self, text: str) -> str:
        cleaned = self._ascii_clean(text or "").lower()
        cleaned = self._COMPANY_SUFFIXES_RE.sub(" ", cleaned)
        cleaned = self._NON_ALNUM_RE.sub(" ", cleaned)
        cleaned = self._MULTI_SPACE_RE.sub(" ", cleaned).strip()
        return cleaned

    def _tokenize(self, text: str) -> list[str]:
        normalized = self._normalize(text)
        return [tok for tok in normalized.split(" ") if tok and tok not in self._STOPWORDS]

    def _char_trigrams(self, token: str) -> Set[str]:
        if len(token) < 3:
            token = token + "_" * (3 - len(token))
        wrapped = f"<{token}>"
        return {wrapped[i:i + 3] for i in range(len(wrapped) - 2)}

    def to_features(self, text: str) -> Set[str]:
        features: Set[str] = set()
        for token in self._tokenize(text):
            features |= self._char_trigrams(token)
        return features

    def are_similar_titles(self, left: str, right: str) -> bool:
        left_features = self.to_features(left)
        right_features = self.to_features(right)
        if not left_features or not right_features:
            return False

        shared = len(left_features & right_features)
        overlap = shared / min(len(left_features), len(right_features))
        return overlap >= self.min_overlap_ratio and shared >= self.min_shared_trigrams
