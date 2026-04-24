# Match-it Backend

Backend services for the **Match-it** Android application — a group activity
consensus app that helps friends agree on movies or nearby restaurants using
a swipe-based voting session and group recommendation algorithms.

> The Android client is available at [match-it-android](https://github.com/Cross-bit/match-it-demo-mobile).

---

## Overview

Match-it allows a group of friends to create a shared voting session, swipe through activity recommendations (movies or restaurants), and converge on something everyone likes. The backend is composed of several microservices, each responsible for a distinct domain of the application.

```
                        ┌──────────────────────────────────────────────┐
                        │              Match-it Backend                │
                        │                                              │
  Android Client  ───►  │  user-account-manager                        │
                        │  friendship-manager                          │
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
Handles user registration, login, authentication (JWT), token refresh, and
profile management (including profile picture upload).

### `friendship-manager` · TypeScript / Node.js / Express
Manages friend requests, friendship CRUD, and people search. Shares a database with `user-account-manager`
to allow efficient relational queries across users and their connections.

### `matching-sessions-service` · TypeScript / Node.js / Express
Core service orchestrating the lifecycle of a voting session — from group creation
and member invitations through live voting to consensus detection. Communicates bidirectionally
with clients and delegates recommendation generation to `activity-recommendation-system`.

### `activity-recommendation-system` · Python / Flask
Provides recommendation endpoints consumed by `matching-sessions-service`. Implements group recommendation algorithms for activity suggestions. Currently supports **movie recommendations**; restaurant recommendations rely on external POI data from Google Places API.

---

## Databases

The system uses a single **PostgreSQL** instance. Schema is defined via ordered init scripts in `./databases/postgresql/db1/init/`. Tables are intentionally decoupled across service domains — relationships are maintained via shared UUIDs rather than cross-domain foreign keys, so the schema can be split into per-service databases in the future if needed.

---

## External Dependencies

| Service | Purpose |
|---|---|
| [Mailgun](https://www.mailgun.com/) | Transactional email (registration, invitations) |
| [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) | Push notifications |
| [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview) | Nearby restaurant discovery |
| [The Movie Database (TMDB)](https://www.themoviedb.org/documentation/api) | Movie metadata (descriptions, ratings, posters) |

---

## Dataset Preparation

Dataset preparation scripts live under `./tools/data/`. See the README in each subdirectory for detailed usage instructions.

**Movies:** The movie recommender (EASE) requires a [MovieLens](https://grouplens.org/datasets/movielens/) dataset
for training. Use the preparation script to produce a reduced subset — EASE builds a full item×item
co-occurrence matrix and computes its inverse, which is memory and compute intensive on the full dataset.
Processed files go into `services/activity-recommendation-system/src/datasets/movies/ml/`.
See `tools/data/movies/README.md` for details.


**Restaurants:** The restaurant recommendation feature relies on a pre-fetched dataset obtained via the Google
Places API. This dataset is not included in the repository.
See `tools/data/restaurants/README.md` for details.

---

## Running Locally

The entire backend can be started in development mode from the repository root:

```sh
./tools/build/compose.sh --dev up
```

This uses Docker Compose to build and start all services together with the database.

### Prerequisites

- Docker + Docker Compose
- Configured `.env.dev` file — see `.env.example` in the repository root

### Environment Configuration

Create a `.env.dev` file based on the provided template:

```bash
cp .env.example .env.dev
```

#### Firebase Credentials (FCM)

Firebase push notifications require a service account JSON file placed directly in the repository — setting the env variable alone is not enough.

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Project Settings → Service Accounts → Generate new private key**
2. Save the downloaded file as:
   ```
   config/credentials/firebase.json
   ```
3. Make sure your `.env.dev` contains:
   ```dotenv
   FIREBASE_APPLICATION_CREDENTIALS=./config/credentials/firebase.json
   ```

⚠️ This application is designed for group interaction. Core functionality
(group formation, invitations, and synchronized voting sessions) relies on
Firebase Cloud Messaging.

Without FCM, the system cannot support a multi-user session.
> It is required by both `matching-sessions-service` and `friendship-manager`. The `config/credentials/` directory is git-ignored — never commit the credentials file.

#### Required Variables

| Variable | Description |
|---|---|
| `ACCESS_TOKEN_SECRET` | Secret key for JWT access token signing |
| `REFRESH_TOKEN_SECRET` | Secret key for JWT refresh token signing |
| `FIREBASE_APPLICATION_CREDENTIALS` | Path to FCM credentials file (see above) |
| `TMDB_API_KEY` | Required for movie metadata |
| `GOOGLE_PLACES_API_KEY` | Required for restaurant data and photo fetching |

#### Optional Variables

| Variable | Description |
|---|---|
| `EMAIL_MAILGUN_API_KEY` | Required only for email verification on registration; disabled by default via `BYPASS_EMAIL_VERIFICATION` |
| `SUDO_API_KEY` | Enables privileged REST endpoints |

### Networking Notes

- Android emulator: use `10.0.2.2` to reach the backend running on the host machine
- Physical device: use your local IP (e.g. `192.168.x.x`)

Some URLs in the `.env.dev` file may need to be adjusted accordingly — see the inline comments.

---

## Unit Testing

Unit tests are currently set up for TypeScript services:

- `matching-sessions-service`
- `friendship-service`
- `user-account-service`

### Run tests for one service (local Node.js)

From the service directory:

```sh
npm test
```

### Run tests via helper script

From repository root:

```sh
./tools/tests/run-unit-tests.sh
```

Default mode is `local` (no Docker required): script runs `npm test` in each service directory.

Run explicitly in local mode:

```sh
./tools/tests/run-unit-tests.sh --mode local
```

Run in Docker mode:

```sh
./tools/tests/run-unit-tests.sh --mode docker
```

Run only one service:

```sh
./tools/tests/run-unit-tests.sh --service matching-sessions-service
```

Skip rebuild (faster repeated runs):

```sh
./tools/tests/run-unit-tests.sh --no-build
```

### Practical workflow

- For quick local iteration: run `npm test` in the specific service.
- For reproducible CI-like run: use Docker mode `./tools/tests/run-unit-tests.sh --mode docker`.
- Tests are independent of running `docker compose up`; Docker mode uses short-lived containers via `docker compose run --rm`.

---

## Repository Structure

```
.
├── databases/
│   └── postgresql/db1/
│       └── init/                    # Ordered SQL init scripts
├── services/
│   ├── user-account-manager/
│   ├── friendship-manager/
│   ├── matching-sessions-service/
│   │   └── config/credentials/      # FCM credentials (git-ignored)
│   └── activity-recommendation-system/
│       └── src/
│           └── services/
│              └── datasets/
│                  ├── movies/ml/       # Prepared MovieLens data (not included)
│                  └── restaurants/     # Prepared Places API data (not included)
└── tools/
    ├── build/
    │   └── compose.sh               # Build & deployment helper
    ├── tests/
    │   └── run-unit-tests.sh        # Runs unit tests in Docker
    └── data/
        ├── movies/                  # MovieLens preparation script + README
        └── restaurants/             # Google Places aggregation script + README
```

---

> This repository contains a research prototype developed as part of a bachelor's thesis. Some datasets used in experiments are not included.

## License

Copyright (c) 2026 Ondřej Kříž

This software is a research prototype licensed for **non-commercial research and educational use only**. Commercial use is prohibited without explicit written permission.

See [LICENSE](./LICENSE) for full terms. For commercial licensing inquiries contact: ondra.kryz@seznam.cz