# Integration API Tests

Integration tests validate real HTTP communication against running backend services
and a real PostgreSQL test database.

This project focuses on endpoint-level behavior (status codes, payload shape, and
basic persistence side effects), not unit isolation.

## Scope

Current suites cover:

- friendship request flow
- friendship people search
- friendship management endpoints
- movie recommendation session endpoint

## How It Runs

Tests are executed with Jest in serial mode (`--runInBand`) to reduce race
conditions around shared DB setup/cleanup.

The root helper script runs this project and applies additional cleanup for stable
re-runs:

- remove local `dist/` test artifacts
- clear Jest cache
- run Jest with `--no-cache`

## Recommended Execution

From repository root:

```sh
./tools/tests/run-integration-tests.sh --api-only
```

Run all integration projects:

```sh
./tools/tests/run-integration-tests.sh
```

Run with backend stack startup:

```sh
./tools/tests/run-integration-tests.sh --api-only --with-stack
```

## Run Only Selected Failing Suites

From `integration/api-tests`:

```sh
npm test -- --runInBand --no-cache friendship-service/friendshipCreation.test.ts recommendationSystem/movieSessoin.test.ts
```

Single suite:

```sh
npm test -- --runInBand --no-cache friendship-service/friendshipCreation.test.ts
```

## Environment Requirements

Environment is loaded from repository root `.env.test` (fallback copy from
`.env.dev` or `.env.example` is handled by the helper script).

At minimum, ensure:

- database connection values for `db1` are valid
- service ports are correctly set (`FRIENDSHIP_SERVICE_API_PORT`, `ACTIVITY_RECOMMENDATION_SYSTEM_PORT`)
- internal service auth values match recommender expectations:
  - `MATCHING_SESSIONS_SERVICE_IDENTIFIER`
  - `RECSYS_MESSAGING_SERVICE_TOKEN`

## Internal Authentication Note (Recommender)

`activity-recommendation-system` protects endpoints with internal auth. Tests calling
`/api/movie/session/next` must include:

- `X-Service-Name: <matching service identifier>`
- `Authorization: Bearer <service token>`

If missing, endpoint returns `401/403`.

## Common Troubleshooting

- `there is no unique or exclusion constraint matching ON CONFLICT`
  - indicates stale transformed test code or outdated artifacts
  - re-run via helper script (it clears cache and `dist`)
- `Jest did not exit...` or async teardown noise
  - run with `--runInBand`
  - keep `beforeAll/afterAll` hooks awaited and guarded
- SQL parser warnings for `003_activity.sql` and `004_matching_sessions.sql`
  - currently expected in this setup
  - these files are skipped by entity-generation fallback logic

## Notes

- This integration project is intended for local/dev validation.
- CI integration was intentionally not kept active due to environment secret
  management constraints.









