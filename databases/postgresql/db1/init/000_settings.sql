/* =====================================================
* DESCRIPTION
* =======================================================
* Initial script to prepare database environment.
* (extensions, settings, hooks, ... )
*/



/*
  Since we are using uuid_generate_v4() function, that comes from uuid-ossp extension,
  we have to make sure we are using it.
*/
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

/*
  For geolocational data retrieval
*/
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;

-- Install pgvector for vector similarity search (embeddings representation)
CREATE EXTENSION IF NOT EXISTS "vector";



CREATE TYPE sessionType AS ENUM ('CUISINE', 'MOVIE', 'SPORT', 'RESTAURANT', 'BOARDGAME', 'EVENT');

CREATE TYPE sessionState AS ENUM ('CREATED', 'INVITING', 'RUNNING', 'MATCHED', 'FINISHED', 'BROKEN');