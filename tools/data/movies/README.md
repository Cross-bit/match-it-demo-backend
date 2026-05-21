# Příprava datasetu filmů

Vložte raw soubory datasetu MovieLens do `./dataset/`:

```text
dataset/
    movies.csv
    ratings.csv
    links.csv
```

Následně spusťte přípravný skript:

```sh
python prepare_movielens_dataset.py
```

Zpracovaný dataset bude uložen do adresáře `./out/`:

```text
out/
    movies_reduced.csv
    ratings_reduced.csv
```

Tyto soubory poté umístěte do:

```text
services/activity-recommendation-system/src/services/datasets/movies/ml/
```

### Možnosti

| Argument | Výchozí hodnota | Popis |
|---|---:|---|
| `--top-n-movies` | 100000 | Počet nejlepších filmů, které se mají ponechat |
| `--max-ratings` | 5000000 | Maximální počet hodnocení |
| `--recency-weight` | 0.3 | Preference novějších filmů (0–1) |
| `--min-user-interactions` | 30 | Minimální počet hodnocení na uživatele |
| `--min-movie-interactions` | 30 | Minimální počet hodnocení na film |

> MovieLens stáhnete zde: https://grouplens.org/datasets/movielens/  
> Větší dataset výrazně prodlužuje dobu trénování EASE —  
> EASE počítá inverzi matice položka × položka.

### Formát výstupu

`movies_reduced.csv` rozšiřuje původní schéma MovieLens o dodatečný sloupec `year`, který je extrahován z názvu filmu:

| Sloupec | Popis |
|---|---|
| `movieId` | ID filmu v MovieLens |
| `title` | Název filmu, např. `Toy Story (1995)` |
| `genres` | Žánry oddělené svislítkem, např. `Adventure\|Animation\|Children` |
| `year` | Rok extrahovaný z názvu, např. `1995.0` |

`ratings_reduced.csv` zachovává původní schéma MovieLens: `userId, movieId, rating`.
