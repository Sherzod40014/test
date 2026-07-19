-- pg_trgm: needed for the future Universal Search milestone (M8, fuzzy/partial text match)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pgcrypto: used for generating secure random tokens/ids
CREATE EXTENSION IF NOT EXISTS pgcrypto;
