CREATE TABLE IF NOT EXISTS "admin_divisions" (
  "id" text PRIMARY KEY NOT NULL,
  "geoname_id" integer NOT NULL,
  "country_code" text NOT NULL,
  "level" integer NOT NULL,
  "feature_code" text NOT NULL,
  "code" text NOT NULL,
  "parent_code" text,
  "name" text NOT NULL,
  "ascii_name" text NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "admin_divisions" ADD CONSTRAINT "admin_divisions_geoname_id_unique" UNIQUE ("geoname_id");
EXCEPTION
 WHEN duplicate_table THEN null;
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "admin_divisions" ADD CONSTRAINT "admin_divisions_code_unique" UNIQUE ("code");
EXCEPTION
 WHEN duplicate_table THEN null;
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "admin_divisions_country_idx" ON "admin_divisions" USING btree ("country_code");
CREATE INDEX IF NOT EXISTS "admin_divisions_level_idx" ON "admin_divisions" USING btree ("level");
CREATE INDEX IF NOT EXISTS "admin_divisions_parent_idx" ON "admin_divisions" USING btree ("parent_code");
CREATE INDEX IF NOT EXISTS "admin_divisions_code_idx" ON "admin_divisions" USING btree ("code");
