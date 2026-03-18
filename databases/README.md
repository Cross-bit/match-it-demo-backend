# Databases

Contains configuration and schema definitions
for the PostgreSQL instance used by the application.

The schema is initialized via ordered SQL scripts in `./postgresql/db1/init/`.
A dedicated `docker-compose-db.dev.yaml` is provided to spin up the database
independently during development, without starting the full service stack.