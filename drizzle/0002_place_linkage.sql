ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "place_id" text;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "place_key" text;

CREATE INDEX IF NOT EXISTS "locations_place_id_idx" ON "locations" USING btree ("place_id");
CREATE INDEX IF NOT EXISTS "locations_place_key_idx" ON "locations" USING btree ("place_key");

WITH computed_place_links AS (
  SELECT
    "id",
    CASE
      WHEN NULLIF(BTRIM("place_name"), '') IS NOT NULL THEN CONCAT_WS(
        '/',
        'place',
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("country")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("region")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("district")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("city")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        'named',
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("place_name")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), '')
      )
      WHEN NULLIF(BTRIM("address"), '') IS NOT NULL THEN CONCAT_WS(
        '/',
        'place',
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("country")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("region")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("district")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("city")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        'named',
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("address")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), '')
      )
      ELSE CONCAT_WS(
        '/',
        'place',
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("country")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("region")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("district")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("city")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
        'geo',
        COALESCE(
          NULLIF(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(BTRIM("geokey")), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              LOWER(BTRIM(CAST(ROUND("latitude"::numeric, 4) AS text) || '-' || CAST(ROUND("longitude"::numeric, 4) AS text))),
              '[^a-z0-9]+',
              '-',
              'g'
            ),
            '(^-+|-+$)',
            '',
            'g'
          )
        )
      )
    END AS "derived_place_key"
  FROM "locations"
)
UPDATE "locations" AS "target"
SET
  "place_key" = COALESCE(NULLIF(BTRIM("target"."place_key"), ''), "computed"."derived_place_key"),
  "place_id" = COALESCE(
    NULLIF(BTRIM("target"."place_id"), ''),
    'place_' || SUBSTRING(MD5(COALESCE(NULLIF(BTRIM("target"."place_key"), ''), "computed"."derived_place_key")) FROM 1 FOR 10)
  )
FROM computed_place_links AS "computed"
WHERE "target"."id" = "computed"."id"
  AND (
    "target"."place_key" IS NULL
    OR BTRIM("target"."place_key") = ''
    OR "target"."place_id" IS NULL
    OR BTRIM("target"."place_id") = ''
  );
