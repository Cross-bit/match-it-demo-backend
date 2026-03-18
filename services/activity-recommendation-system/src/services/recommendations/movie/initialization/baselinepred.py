#!/bin/python3
import json
import logging
from pathlib import Path
import re
from typing import List
import unicodedata
import numpy as np
import pandas as pd
from surprise import BaselineOnly, Dataset, Reader
import random

from tqdm import tqdm
from src.services.recommendations.movie.utils.movies_similarity import MovieTitleSimilarity

# ====================================
# DESCRIPTION
# ====================================
# Uses baseline predictor

ROOT = Path(__file__).resolve().parent
INIT_ML_DATASET_DIR = ROOT / "../../../datasets/movies/initialization"
MOVIE_LENS_DATASET_DIR = ROOT / "../../../datasets/movies/ml"
MODEL_DIR = ROOT / "../../../models/movies"

class BaselineInitializer:

    def __init__(self, ml_catalog_ids: List[int], number_of_samples: int = 40, sample_size: int = 24, output_file_name = "baseline_init_sets.json"):

        self.dataset_directory = MOVIE_LENS_DATASET_DIR
        self.output_dir = INIT_ML_DATASET_DIR
        self.output_file_name = output_file_name

        self.number_of_samples = number_of_samples       # e.g. 40 sets
        self.sample_size = sample_size                   # e.g. each set has 24 movies
        self.catalog_ids = set(ml_catalog_ids)           # allowed movies only

        # load movies data

        movies_path = self.dataset_directory / "movies.csv"

        movies = pd.read_csv(
            movies_path,
            names=["movieId", "title", "genres", "year"],
            encoding="latin1",
            header=0
        )
        logging.info("movies.dat loaded.")

        movies = movies[movies["movieId"].isin(self.catalog_ids)] # we use only movies from the catalogue (typically these are ides over which we are recommending)
        self.movies_df = movies

        # Token map for similarity checking
        self.similarity = MovieTitleSimilarity(self.movies_df)

        self.year_map = dict(zip(self.movies_df["movieId"], self.movies_df["year"]))
        self.current_year = int(self.movies_df["year"].max())

        ratings_path = self.dataset_directory / "ratings.csv"

        ml = pd.read_csv(
            ratings_path,
            names=["userId", "movieId", "rating"],
            header=0
        )

        ml.rename(columns={"userId": "user_id", "movieId": "movie_id"}, inplace=True)

        ml = ml[ml["movie_id"].isin(self.catalog_ids)] # we use only movies from the catalogue

        self.ratings_df = ml.pivot_table(
            index="user_id",
            columns="movie_id",
            values="rating"
        )

    def prepare_surprise_data(self):
        ratings_long = self.ratings_df.stack().reset_index()
        ratings_long.columns = ["userId", "movieId", "rating"]

        reader = Reader(rating_scale=(1, 5))
        return Dataset.load_from_df(
            ratings_long[["userId", "movieId", "rating"]],
            reader
        )

    def train_baseline_model(self, trainset):
        bsl_options = {"method": "sgd", "learning_rate": 0.005, "n_epochs": 20}
        algo = BaselineOnly(bsl_options=bsl_options)
        algo.fit(trainset)
        return algo

    def compute_rankings(self):
        logging.info("Training Baseline model...")

        data = self.prepare_surprise_data()
        trainset = data.build_full_trainset()
        model = self.train_baseline_model(trainset)

        logging.info("Computing baseline scores for all items...")

        scores = []
        for movie_id in tqdm(self.ratings_df.columns, desc="Scoring movies"):
            pred = model.predict(uid=0, iid=movie_id)
            scores.append((int(movie_id), pred.est))

        logging.info(f"Computed scores for {len(scores)} movies.")

        return sorted(scores, key=lambda x: x[1], reverse=True)

    def apply_recency_rerank(self, candidates, beta=0.4, lambda_=0.1):
        """Applies multiplicative recency reranking."""
        logging.info("Applying recency reranking...")

        scores = np.array([s for _, s in candidates])

        if len(scores) > 0:
            scores = (scores - scores.min()) / (scores.max() - scores.min() + 1e-8)

        rescored = []
        logging.info("Top 10 after recency rerank (year, score):")
        for (movie_id, _), norm_score in zip(candidates, scores):
            year = self.year_map.get(movie_id, self.current_year)

            recency = np.exp(-lambda_ * (self.current_year - year))

            new_score = norm_score * (beta + (1 - beta) * recency)

            rescored.append((movie_id, float(new_score)))

        return sorted(rescored, key=lambda x: x[1], reverse=True)

    def make_sample_set(self, pool_ids):
        """
        Creates ONE sample set of size self.sample_size
        with diversity filtering.
        """

        random.shuffle(pool_ids)
        used = []
        result = []

        for movie_id in pool_ids:
            # skip if similar to already chosen ones
            if any(self.similarity.are_similar(movie_id, u) for u in used):
                continue

            used.append(movie_id)
            result.append(movie_id)

            if len(result) == self.sample_size:
                break

        return result

    def generate_init_data(self):

        logging.info("GENERATING MOVIES INITIALIZATION DATASETS FROM MOVIE-LENS")

        ranked = self.compute_rankings()

        ranked = self.apply_recency_rerank(ranked)

        TOP_POOL = max(self.number_of_samples * 3, 200)

        pool_ids = [movie_id for movie_id, score in ranked[:TOP_POOL]]

        all_sets = []
        for _ in range(self.number_of_samples):
            sample = self.make_sample_set(pool_ids.copy())
            all_sets.append(sample)

        self.output_dir.mkdir(parents=True, exist_ok=True)
        output_file = self.output_dir / "baseline_init_sets.json"

        with open(output_file, "w") as f:
            json.dump(all_sets, f)

        logging.info(f"Generated {len(all_sets)} samples → {output_file}")

        return all_sets