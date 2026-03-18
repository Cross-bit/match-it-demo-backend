# Movie Dataset Preparation

Place the raw MovieLens dataset files into `./dataset/`:
```
dataset/
    movies.csv
    ratings.csv
    links.csv
```

Then run the preparation script:
```sh
python prepare_movielens_dataset.py
```

The processed dataset will be written to `./out/`:
```
out/
    movies_reduced.csv
    ratings_reduced.csv
```

These files should then be placed in:
```
services/activity-recommendation-system/datasets/movies/ml/
```

### Options

| Argument | Default | Description |
|---|---|---|
| `--top-n-movies` | 100000 | Number of top movies to keep |
| `--max-ratings` | 5000000 | Maximum number of ratings |
| `--recency-weight` | 0.3 | Preference for newer movies (0–1) |
| `--min-user-interactions` | 30 | Minimum ratings per user |
| `--min-movie-interactions` | 30 | Minimum ratings per movie |

> Download MovieLens at: https://grouplens.org/datasets/movielens/
> A larger dataset significantly increases EASE training time —
> EASE computes an inverse of an item×item matrix.


### Output format

`movies_reduced.csv` extends the original MovieLens schema with an additional `year` column
extracted from the title:

| Column | Description |
|---|---|
| `movieId` | MovieLens movie ID |
| `title` | Movie title (e.g. `Toy Story (1995)`) |
| `genres` | Pipe-separated genres (e.g. `Adventure\|Animation\|Children`) |
| `year` | Year extracted from title (e.g. `1995.0`) |

`ratings_reduced.csv` preserves the original MovieLens schema: `userId, movieId, rating`.