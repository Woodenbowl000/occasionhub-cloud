-- Performance indexes added for the cloud deployment (SE-490 CEA).
--
-- 1. City search uses `city ILIKE '%term%'` (Prisma `contains` + insensitive).
--    A B-tree index cannot serve a leading wildcard; a trigram GIN index can.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE INDEX IF NOT EXISTS "Location_city_trgm_idx" ON "Location" USING GIN ("city" gin_trgm_ops);

-- 2. Spatial index for distance / map queries on the PostGIS column.
--    (Not expressible in schema.prisma because the column is Unsupported.)
CREATE INDEX IF NOT EXISTS "Location_coordinates_gist_idx" ON "Location" USING GIST ("coordinates");

-- 3. The public venue list always filters approved + available venues and
--    sorts by postedDate: one composite index serves filter and sort together.
CREATE INDEX IF NOT EXISTS "Venue_isApproved_isAvailable_postedDate_idx" ON "Venue"("isApproved", "isAvailable", "postedDate");

-- 4. Foreign keys PostgreSQL does not index automatically (used by joins).
CREATE INDEX IF NOT EXISTS "Venue_locationId_idx" ON "Venue"("locationId");
CREATE INDEX IF NOT EXISTS "Favorite_venueId_idx" ON "Favorite"("venueId");
