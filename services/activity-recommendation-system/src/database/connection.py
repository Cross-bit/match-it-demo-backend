import os
import psycopg2
from psycopg2.extras import execute_values

MAIN_DB_CONFIG = {
    "dbname": os.getenv("MAIN_DB_NAME"),
    "user": os.getenv("MAIN_DB_USER"),
    "password": os.getenv("MAIN_DB_PASS"),
    "host": os.getenv("MAIN_DB_HOST"),
    "port": os.getenv("MAIN_DB_PORT"),
    "sslmode": "require" if os.getenv("USES_SSL") == "1" else "disable",
}

def get_db_connection():
    return psycopg2.connect(**MAIN_DB_CONFIG)