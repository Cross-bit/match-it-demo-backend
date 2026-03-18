# Match-it Backend

Backend services for the **Match-it** Android application — a group activity consensus app that helps friends agree on movies or nearby restaurants using a swipe-based voting session and group recommendation algorithms.

> The Android client is available at [match-it-android](https://gitlab.mff.cuni.cz/krizondr/match-it-android).

---

## Overview

Match-it allows a group of friends to create a shared voting session, swipe through activity recommendations (movies or restaurants), and converge on something everyone likes. The backend is composed of several microservices, each responsible for a distinct domain of the application.

```
                        ┌──────────────────────────────────────────────┐
                        │              Match-it Backend                │
                        │                                              │
  Android Client  ───►  │  user-account-manager   friendship-manager   │
                        │  matching-sessions-service                   │
                        │  activity-recommendation-system              │
                        │                                              │
                        │  External: Mailgun · FCM · Google Places API │
                        │           The Movie Database (TMDB)          │
                        └──────────────────────────────────────────────┘
```

---

## Services

All services live under `./services/`. Each subdirectory corresponds to one independently deployable service.

### `user-account-manager` · TypeScript / Node.js / Express
Handles user registration, login, authentication (JWT), token refresh, and profile management (including profile picture upload).

### `friendship-manager` · TypeScript / Node.js / Express
Manages friend requests, friendship CRUD, and people search. Shares a database with `user-account-manager` to allow efficient relational queries across users and their connections.

### `matching-sessions-service` · TypeScript / Node.js / Express
Core service orchestrating the lifecycle of a voting session — from group creation and member invitations through live voting to consensus detection. Communicates bidirectionally with clients and delegates recommendation generation to `activity-recommendation-system`.

### `activity-recommendation-system` · Python / Flask
Provides recommendation endpoints consumed by `matching-sessions-service`. Implements group recommendation algorithms for activity suggestions. Currently supports **movie recommendations**; restaurant recommendations rely on external POI data from Google Places API.

---

## Databases

The system uses a single **PostgreSQL** instance.
The schema is defined via ordered init scripts
in `./databases/postgresql/db1/init/`.
Tables are intentionally decoupled across service
domains -- relationships are maintained via shared UUIDs rather than cross-domain foreign keys, so the schema can be split into per-service databases in the future if needed.

---

## External Dependencies

| Service | Purpose |
|---|---|
| [Mailgun](https://www.mailgun.com/) | Transactional email (registration, invitations) |
| [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) | Push notifications |
| [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview) | Nearby restaurant discovery |
| [The Movie Database (TMDB)](https://www.themoviedb.org/documentation/api) | Movie metadata (descriptions, ratings, posters) |

---

## Dataset

**Restaurants:** The restaurant recommendation feature relies on a
pre-fetched dataset obtained via the Google Places API.
This dataset is not included in the repository. See
`services/activity-recommendation-system/datasets/restaurants/README.md`
for details.

**Movies:** The movie recommender (EASE) requires a
[MovieLens](https://grouplens.org/datasets/movielens/) dataset for training.
Place the following files into
`services/activity-recommendation-system/datasets/movies/ml/`:
```
links.csv
movies.csv
ratings.csv
```

> It is recommended to use a reduced subset of the dataset.
> EASE builds a full item×item co-occurrence matrix and computes
> its inverse — training on the full MovieLens dataset is
> memory and compute intensive.

Dataset preparation scripts and instructions are available in `./tools/data/`.
See the README in each subdirectory for details on required input files and usage.

## Running Locally

The entire backend can be started in development mode from the repository root:

```sh
./tools/build/compose.sh --dev up
```

This uses Docker Compose to build and start all services together with the database.

### Prerequisites
- Docker + Docker Compose
- Configured .env files — see .env.example in the repository root

### Environment Configuration

Create a `.env` file based on the provided template:

```sh
    cp .env.example .env.dev
```

## Environment Configuration

Create a `.env` file based on the provided template:

```bash
cp .env.example .env
```

### Required & External APIs

- `ACCESS_TOKEN_SECRET` -- secret key for JWT access token verification
- `REFRESH_TOKEN_SECRET` -- secret key for JWT refresh token verification
- `FIREBASE_APPLICATION_CREDENTIALS` – required for push notifications (without this the app will not work).
    Is required by the `matching-sessions-service` and `friendship-service`
    You have to download appropriate authentication file for the FCM from the firebase and paste
    it to the specified location in this variable in both containers.
- `TMDB_API_KEY` – required for movie data
- `GOOGLE_PLACES_API_KEY` – required for additional restaurant data e.g. photos fetch,
    can be omitted if all the data were provided locally using the `prepare_movielens_dataset.py`.

### Optional
- `EMAIL_MAILGUN_API_KEY` – required only for email verification when registering, by default is set off using `BYPASS_EMAIL_VERIFICATION`
- `SUDO_API_KEY` - some useful special endpoints REST API endpoints can make use of this

### Networking Notes

- Android emulator: use `10.0.2.2` to access backend running on host machine
- Physical device: use your local IP address (e.g. `192.168.x.x`)

Some URLs in the `.env` file may need to be adjusted accordingly.
See the comments.


---
## Repository Structure

```
.
├── database/               # DB schemas and migrations
├── services/
│   ├── user-account-manager/
│   ├── friendship-manager/
│   ├── matching-sessions-service/
│   └── activity-recommendation-system/
└── tools/
    └── data/               # Dataset generation & aggregation scripts for recommender
        └── restaurants/
        └── movies/
    └── build/
        └── compose.sh      # Build & deployment scripts
```

---

> This repository contains a research prototype developed as part of a bachelor's thesis. Some datasets used in experiments are not included.
