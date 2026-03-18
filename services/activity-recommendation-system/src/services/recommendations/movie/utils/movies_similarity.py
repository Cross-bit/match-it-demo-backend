from abc import ABC, abstractmethod
import logging
import re
import unicodedata

# ==================================================
# DESCRIPTION
# ==================================================
# Tests similarity of movies over their titles (from movie-lens).
#


# stopwords we leave out from the title
STOPWORDS = {"the", "a", "an", "of", "and", "in", "to", "for", "on"}

class TextFeatureExtractor:
    def __init__(self, stopwords=None):
        self.stopwords = stopwords or set()

    def ascii_clean(self, s: str) -> str:
        return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')

    def tokenize(self, text: str):
        t = self.ascii_clean(text)
        t = re.sub(r"[^a-zA-Z0-9 ]", " ", t).lower()
        t = re.sub(r"\d+", "<num>", t)

        tokens = []
        for tok in t.split():
            if tok in self.stopwords:
                continue
            if tok:
                tokens.append(tok)
        return tokens

    def char_trigrams(self, word: str) -> set[str]:
        if len(word) < 3:
            word = word + "_" * (3 - len(word))

        w = f"<{word}>"
        return {w[i:i+3] for i in range(len(w) - 2)}

    def text_to_features(self, text: str) -> set[str]:
        tokens = self.tokenize(text)

        trigrams = set()
        for word in tokens:
            trigrams |= self.char_trigrams(word)

        return trigrams

class MovieTextExtractor(TextFeatureExtractor):
    def preprocess(self, text: str) -> str:
        text = re.sub(r"\(\d{4}\)$", "", text).strip()
        return text

    def text_to_features(self, text: str) -> set[str]:
        text = self.preprocess(text)
        return super().text_to_features(text)


class SimilarityEngine(ABC):
    @abstractmethod
    def similarity(self, a, b) -> float:
        pass

    @abstractmethod
    def are_similar(self, a, b) -> bool:
        pass

class TrigramSimilarityEngine(SimilarityEngine):
    def __init__(self, min_overlap_ratio=0.45, min_shared=3):
        self.min_overlap_ratio = min_overlap_ratio
        self.min_shared = min_shared

    def similarity(self, a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        return len(a & b) / len(a | b)

    def are_similar(self, a: set[str], b: set[str]) -> bool:
        if not a or not b:
            return False

        shared = len(a & b)
        overlap = shared / min(len(a), len(b))

        return overlap >= self.min_overlap_ratio and shared >= self.min_shared


class MovieTitleSimilarity:
    def __init__(self, movies_df):
        self.extractor = MovieTextExtractor(STOPWORDS)
        self.sim_engine = TrigramSimilarityEngine()

        self.movie_tokens = {}

        for _, row in movies_df.iterrows():
            movie_id = int(row.movieId)
            title = str(row.title)

            features = self.extractor.text_to_features(title)
            self.movie_tokens[movie_id] = features

    def are_similar(self, id_a: int, id_b: int) -> bool:
        return self.sim_engine.are_similar(
            self.movie_tokens.get(id_a, set()),
            self.movie_tokens.get(id_b, set())
        )

class RestaurantTextExtractor(TextFeatureExtractor):
    def preprocess(self, text: str) -> str:
        text = text.lower()

        # remove company suffixes
        text = re.sub(r"\b(s\.?r\.?o\.?|ltd\.?|inc\.?)\b", "", text)
        return text.strip()

    def text_to_features(self, text: str) -> set[str]:
        text = self.preprocess(text)
        return super().text_to_features(text)

class RestaurantNameSimilarity:
    def __init__(self, restaurants_df):
        self.extractor = RestaurantTextExtractor(STOPWORDS)
        self.sim_engine = TrigramSimilarityEngine(
            min_overlap_ratio=0.5,
            min_shared=4
        )

        self.rest_tokens = {}

        for _, row in restaurants_df.iterrows():
            rid = int(row.id)
            name = str(row.name)

            features = self.extractor.text_to_features(name)
            self.rest_tokens[rid] = features

    def are_similar(self, id_a: int, id_b: int) -> bool:
        return self.sim_engine.are_similar(
            self.rest_tokens.get(id_a, set()),
            self.rest_tokens.get(id_b, set())
        )